"""CivicMesh chat intake panel.
Left: conversation thread.
Right: detected language + walker chain status sidebar.

Design system: clinical/civic — flat hairline-bordered sections, no blur,
no glow, weight-driven hierarchy over color. Ink #1A1D1F on paper #F7F7F5,
institutional green #1B4B43 for primary state, restrained red #B42318
reserved for genuine escalation only.
"""
sv import from walkers.intake { IntakeWalker }
sv import from walkers.translate { TranslateWalker }

def:pub ChatPane(
    user_id: str,
    on_walker_event: Any,
    session_data: dict,
    walker_events: list = []
) -> JsxElement {
    has messages: list[dict] = [],
        input_val: str = "",
        is_loading: bool = False,
        active_walker: str = "",
        detected_language: str = "",
        profile_extracted: Any = {},
        open_trace_idx: int = -1,
        translation_cache: dict = {},
        voice_listening: bool = False,
        voice_supported: bool = True,
        voice_interim: str = "";

    can with entry {
        seed = [
            {
                "role": "bot",
                "text": "Hi, I'm CivicMesh. I help people find housing, food, healthcare, and legal aid. Talk to me in any language. Choose a prompt below or describe your situation in your own words.",
                "walker": "system",
                "suggestions": [
                    "I'm a single mother with 2 kids in Houston. I earn $1,800/month and need housing help.",
                    "Mi familia y yo no hemos comido en 2 días. Estamos en Texas.",
                    "I'm 72, on $1200/month Social Security, my landlord is trying to evict me illegally."
                ]
            }
        ];
        has_history_flag = False;
        try {
            has_history_flag = bool(session_data["has_history"]);
        } except Exception as _ex {}
        if has_history_flag {
            summary: Any = None;
            try {
                summary = session_data["session_summary"];
            } except Exception as _ex {}
            if summary {
                next_step = "";
                try {
                    nrs = summary["next_recommended_step"];
                    if nrs { next_step = str(nrs); }
                } except Exception as _ex {}
                if next_step {
                    seed = seed + [
                        {
                            "role": "bot",
                            "text": next_step,
                            "walker": "MemoryWalker"
                        }
                    ];
                }
            }
        }
        messages = seed;
    }

    async def sendMessage(text_override: str = "") -> None;
    def renderMessage(msg: dict, idx: int, is_last: bool) -> JsxElement;
    def renderTraceStep(step: Any, idx: int) -> JsxElement;
    def renderSuggestionChip(text: str) -> JsxElement;
    def renderEscapePath(path: Any, idx: int) -> JsxElement;
    def walkerColor(walker_name: str) -> str;
    def isLowSignal(text: str) -> bool;
    def generateSuggestions(profile: Any, escalated: bool, bot_walker: str, user_text: str) -> list;
    def detectIntent(text: str) -> str;

    profile_category = "";
    profile_urgency = "";
    if profile_extracted {
        try {
            raw_cat = profile_extracted["category"];
            if raw_cat { profile_category = str(raw_cat); }
        } except Exception as _ex { profile_category = ""; }
        try {
            raw_urg = profile_extracted["urgency"];
            if raw_urg { profile_urgency = str(raw_urg); }
        } except Exception as _ex { profile_urgency = ""; }
    }

    # Each walker: name, muted institutional accent, one-line role, live status.
    # Escalation keeps the reserved red — every other walker shares the same
    # quiet ink/green treatment so no walker visually competes for attention;
    # hierarchy comes from weight and position, not five different hues.
    walker_pipeline: list[dict] = [
        {"name": "IntakeWalker",      "color": "#1B4B43", "role": "Extracts your need and language", "live": "Reading your message"},
        {"name": "EligibilityWalker", "color": "#1B4B43", "role": "Checks 40 resources against your profile", "live": "Checking eligibility"},
        {"name": "NavigationWalker",  "color": "#1B4B43", "role": "Builds the ordered action plan",     "live": "Building your plan"},
        {"name": "MemoryWalker",      "color": "#1B4B43", "role": "Saves your session for return visits", "live": "Saving session"},
        {"name": "EscalationWalker",  "color": "#B42318", "role": "Routes to crisis lines if no match",     "live": "Escalating"}
    ];

    def walkerState(name: str) -> str;
    def renderWalkerNode(w: dict, is_last: bool) -> JsxElement;

    return
        <div
            style={{
                "display": "grid",
                "gridTemplateColumns": "1fr 260px",
                "gap": "1px",
                "height": "calc(100vh - 96px)",
                "background": "#D0D5DD",
                "border": "1px solid #D0D5DD"
            }}
        >
            <div
                style={{
                    "background": "#FFFFFF",
                    "display": "flex",
                    "flexDirection": "column",
                    "overflow": "hidden"
                }}
            >
                <div
                    style={{
                        "padding": "16px 18px",
                        "borderBottom": "1px solid #D0D5DD",
                        "display": "flex",
                        "alignItems": "center",
                        "gap": "10px"
                    }}
                >
                    <div style={{"flex": "1"}}>
                        <div style={{"fontFamily": "'Source Serif 4', Georgia, serif", "fontSize": "17px", "fontWeight": "600", "color": "#1A1D1F"}}>
                            CivicMesh Navigator
                        </div>
                        <div style={{"fontFamily": "Inter, sans-serif", "fontSize": "12px", "color": "#5D6672", "marginTop": "3px"}}>
                            Multi-agent case navigator — 40+ resources, any language
                        </div>
                    </div>
                    {active_walker and <div
                        style={{
                            "display": "flex",
                            "alignItems": "center",
                            "gap": "7px",
                            "padding": "5px 11px",
                            "borderRadius": "3px",
                            "background": "#F2F4F7",
                            "border": "1px solid #D0D5DD"
                        }}
                    >
                        <span style={{"width": "6px", "height": "6px", "borderRadius": "50%", "background": "#1B4B43", "flexShrink": "0"}}/>
                        <span style={{"fontFamily": "Inter, sans-serif", "fontSize": "11px", "color": "#1B4B43", "fontWeight": "600"}}>
                            {active_walker}
                        </span>
                    </div>}
                </div>
                <div
                    style={{
                        "flex": "1",
                        "overflowY": "auto",
                        "padding": "18px",
                        "display": "flex",
                        "flexDirection": "column",
                        "gap": "12px",
                        "background": "#F7F7F5"
                    }}
                >
                    {[renderMessage(messages[i], i, (i == len(messages) - 1) and (not is_loading)) for i in range(len(messages))]}
                    {is_loading and <div style={{"display": "flex", "alignItems": "center", "gap": "9px"}}>
                        <div
                            style={{
                                "width": "30px",
                                "height": "30px",
                                "borderRadius": "3px",
                                "background": "#1B4B43",
                                "display": "flex",
                                "alignItems": "center",
                                "justifyContent": "center",
                                "fontFamily": "Inter, sans-serif",
                                "fontSize": "11px",
                                "fontWeight": "700",
                                "color": "#F7F7F5",
                                "flexShrink": "0"
                            }}
                        >
                            CM
                        </div>
                        <div
                            style={{
                                "padding": "11px 15px",
                                "borderRadius": "3px",
                                "background": "#FFFFFF",
                                "border": "1px solid #D0D5DD",
                                "display": "flex",
                                "gap": "5px",
                                "alignItems": "center"
                            }}
                        >
                            <span style={{"width": "5px", "height": "5px", "borderRadius": "50%", "background": "#8B949A"}}/>
                            <span style={{"width": "5px", "height": "5px", "borderRadius": "50%", "background": "#8B949A"}}/>
                            <span style={{"width": "5px", "height": "5px", "borderRadius": "50%", "background": "#8B949A"}}/>
                        </div>
                    </div>}
                </div>
                <div
                    style={{
                        "padding": "14px 16px",
                        "borderTop": "1px solid #D0D5DD",
                        "display": "flex",
                        "gap": "10px",
                        "alignItems": "center",
                        "background": "#FFFFFF"
                    }}
                >
                    <input
                        value={input_val}
                        onChange={lambda e: ChangeEvent { input_val = e.target.value; }}
                        onKeyDown={lambda e: KeyboardEvent {
                            if e.key == "Enter" { sendMessage(); }
                        }}
                        placeholder="Type in any language"
                        disabled={is_loading}
                        style={{
                            "flex": "1",
                            "padding": "11px 14px",
                            "background": "#FFFFFF",
                            "border": "1px solid #D0D5DD",
                            "borderRadius": "4px",
                            "color": "#1A1D1F",
                            "fontFamily": "Inter, sans-serif",
                            "fontSize": "14px",
                            "outline": "none"
                        }}
                    />
                    <button
                        onClick={lambda _e: MouseEvent { sendMessage(); }}
                        disabled={is_loading}
                        style={{
                            "padding": "11px 18px",
                            "borderRadius": "4px",
                            "background": ("#1B4B43" if (input_val and (not is_loading)) else "#D0D5DD"),
                            "border": "none",
                            "cursor": "pointer",
                            "fontFamily": "Inter, sans-serif",
                            "fontSize": "13px",
                            "fontWeight": "600",
                            "color": "#FFFFFF",
                            "flexShrink": "0"
                        }}
                    >
                        Send
                    </button>
                </div>
            </div>
            <div style={{"display": "flex", "flexDirection": "column", "gap": "1px", "background": "#D0D5DD"}}>
                <div
                    style={{
                        "padding": "16px",
                        "background": "#FFFFFF"
                    }}
                >
                    <div
                        style={{
                            "fontFamily": "Inter, sans-serif",
                            "fontSize": "11px",
                            "fontWeight": "600",
                            "color": "#5D6672",
                            "marginBottom": "9px"
                        }}
                    >
                        Detected language
                    </div>
                    {(<div
                        style={{
                            "fontFamily": "'Source Serif 4', Georgia, serif",
                            "fontSize": "24px",
                            "fontWeight": "600",
                            "color": "#1B4B43"
                        }}
                    >
                        {detected_language.upper()}
                    </div>) if detected_language else (<div style={{"fontFamily": "Inter, sans-serif", "fontSize": "13px", "color": "#8B949A"}}>Waiting for a message</div>)}
                    {profile_category and <div
                        style={{
                            "marginTop": "11px",
                            "display": "flex",
                            "flexDirection": "column",
                            "gap": "6px",
                            "paddingTop": "11px",
                            "borderTop": "1px solid #F2F4F7"
                        }}
                    >
                        <div style={{"fontFamily": "Inter, sans-serif", "fontSize": "12px", "color": "#5D6672"}}>
                            Need <span style={{"color": "#1A1D1F", "fontWeight": "600"}}>{profile_category}</span>
                        </div>
                        <div style={{"fontFamily": "Inter, sans-serif", "fontSize": "12px", "color": "#5D6672"}}>
                            Urgency <span style={{"color": "#1A1D1F", "fontWeight": "600"}}>{profile_urgency}</span>
                        </div>
                    </div>}
                </div>
                <div
                    style={{
                        "padding": "16px",
                        "background": "#FFFFFF",
                        "flex": "1"
                    }}
                >
                    <div
                        style={{
                            "fontFamily": "Inter, sans-serif",
                            "fontSize": "11px",
                            "fontWeight": "600",
                            "color": "#5D6672",
                            "marginBottom": "13px"
                        }}
                    >
                        Walker pipeline
                    </div>
                    <div style={{"display": "flex", "flexDirection": "column", "gap": "0"}}>
                        {[renderWalkerNode(walker_pipeline[i], i == len(walker_pipeline) - 1) for i in range(len(walker_pipeline))]}
                    </div>
                </div>
            </div>
        </div>;
}
