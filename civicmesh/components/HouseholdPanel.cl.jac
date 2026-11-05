"""HouseholdPanel — add/edit/remove household members for the active case.

New capability surfaced in the UI: CivicMesh previously only modeled a
single applicant via PersonNode.family_size: int. Every member added here
becomes a real HouseholdMemberNode (see graph/nodes.jac) that
EligibilityWalker can read alongside the flattened profile fields — a
child's age can qualify the household for WIC even when the primary
applicant is well outside WIC's own age range, and a specific member's
immigration status no longer silently excludes eligible members of a
mixed-status household.

Talks to HouseholdWalker (walkers/household.jac) via its four modes:
add_member / update_member / remove_member / list_members.
"""

sv import from walkers.household { HouseholdWalker }

def:pub HouseholdPanel(user_id: str) -> JsxElement {
    has members: list[dict] = [],
        is_open: bool = False,
        is_loading: bool = False,
        err: str = "",
        form_relationship: str = "dependent",
        form_age: str = "",
        form_status: str = "unspecified",
        form_disability: bool = False,
        editing_id: str = "";

    can with entry {
        loadMembers();
    }

    async def loadMembers() -> None;
    async def submitMember() -> None;
    async def removeMember(member_id: str) -> None;
    def startEdit(m: dict) -> None;
    def resetForm() -> None;
    def relationshipLabel(rel: str) -> str;
    def renderMemberRow(m: dict) -> JsxElement;

    RELATIONSHIP_OPTIONS: list[str] = ["spouse", "child", "parent", "dependent", "other"];
    STATUS_OPTIONS: list[str] = ["citizen", "lpr", "refugee", "asylee", "undocumented", "unspecified"];

    return
        <div
            style={{
                "background": "#FFFFFF",
                "border": "1px solid #D0D5DD",
                "borderRadius": "4px",
                "overflow": "hidden"
            }}
        >
            <button
                onClick={lambda _e: MouseEvent { is_open = not is_open; }}
                style={{
                    "width": "100%",
                    "display": "flex",
                    "alignItems": "center",
                    "justifyContent": "space-between",
                    "padding": "14px",
                    "background": "transparent",
                    "border": "none",
                    "cursor": "pointer",
                    "textAlign": "left"
                }}
            >
                <div style={{"display": "flex", "alignItems": "center", "gap": "10px"}}>
                    <span style={{"fontSize": "10px", "color": "#5D6672", "textTransform": "uppercase", "letterSpacing": "0.06em"}}>
                        Household
                    </span>
                    <span
                        style={{
                            "fontSize": "11px",
                            "padding": "2px 8px",
                            "borderRadius": "3px",
                            "background": "rgba(27,75,67,0.08)",
                            "color": "#1B4B43"
                        }}
                    >
                        {str(len(members) + 1) + " total"}
                    </span>
                </div>
                <span style={{"color": "#8B949A", "fontSize": "12px"}}>
                    {"Hide" if is_open else "Manage"}
                </span>
            </button>

            {is_open and <div style={{"padding": "0 14px 14px 14px", "display": "flex", "flexDirection": "column", "gap": "8px"}}>
                <div
                    style={{
                        "padding": "9px 11px",
                        "background": "#F2F4F7",
                        "borderRadius": "3px",
                        "fontSize": "12px",
                        "color": "#5D6672",
                        "display": "flex",
                        "alignItems": "center",
                        "gap": "8px"
                    }}
                >
                    <span style={{"width": "6px", "height": "6px", "borderRadius": "50%", "background": "#1B4B43", "flexShrink": "0"}}/>
                    Primary applicant (you)
                </div>

                {err and <div style={{"fontSize": "11px", "color": "#B42318"}}>{err}</div>}

                {[renderMemberRow(members[i]) for i in range(len(members))]}

                <div
                    style={{
                        "padding": "11px",
                        "background": "#F2F4F7",
                        "borderRadius": "3px",
                        "display": "flex",
                        "flexDirection": "column",
                        "gap": "7px"
                    }}
                >
                    <div style={{"fontSize": "10px", "color": "#5D6672", "textTransform": "uppercase", "letterSpacing": "0.06em"}}>
                        {"Editing member" if editing_id else "Add a household member"}
                    </div>
                    <div style={{"display": "grid", "gridTemplateColumns": "1fr 1fr", "gap": "7px"}}>
                        <select
                            value={form_relationship}
                            onChange={lambda e: ChangeEvent { form_relationship = e.target.value; }}
                            style={{
                                "padding": "7px 9px",
                                "background": "#FFFFFF",
                                "border": "1px solid #D0D5DD",
                                "borderRadius": "3px",
                                "color": "#1A1D1F",
                                "fontSize": "12px"
                            }}
                        >
                            {[<option key={RELATIONSHIP_OPTIONS[i]} value={RELATIONSHIP_OPTIONS[i]}>{relationshipLabel(RELATIONSHIP_OPTIONS[i])}</option> for i in range(len(RELATIONSHIP_OPTIONS))]}
                        </select>
                        <input
                            type="number"
                            value={form_age}
                            onChange={lambda e: ChangeEvent { form_age = e.target.value; }}
                            placeholder="Age"
                            style={{
                                "padding": "7px 9px",
                                "background": "#FFFFFF",
                                "border": "1px solid #D0D5DD",
                                "borderRadius": "3px",
                                "color": "#1A1D1F",
                                "fontSize": "12px"
                            }}
                        />
                    </div>
                    <select
                        value={form_status}
                        onChange={lambda e: ChangeEvent { form_status = e.target.value; }}
                        style={{
                            "padding": "7px 9px",
                            "background": "#FFFFFF",
                            "border": "1px solid #D0D5DD",
                            "borderRadius": "3px",
                            "color": "#1A1D1F",
                            "fontSize": "12px"
                        }}
                    >
                        {[<option key={STATUS_OPTIONS[i]} value={STATUS_OPTIONS[i]}>{STATUS_OPTIONS[i]}</option> for i in range(len(STATUS_OPTIONS))]}
                    </select>
                    <label style={{"display": "flex", "alignItems": "center", "gap": "8px", "fontSize": "12px", "color": "#3D444C", "cursor": "pointer"}}>
                        <input
                            type="checkbox"
                            checked={form_disability}
                            onChange={lambda e: ChangeEvent { form_disability = e.target.checked; }}
                        />
                        Has a disability relevant to eligibility
                    </label>
                    <div style={{"display": "flex", "gap": "7px"}}>
                        <button
                            onClick={lambda _e: MouseEvent { submitMember(); }}
                            disabled={is_loading}
                            style={{
                                "flex": "1",
                                "padding": "9px",
                                "borderRadius": "3px",
                                "border": "none",
                                "background": "#1B4B43",
                                "color": "#FFFFFF",
                                "fontWeight": "600",
                                "fontSize": "12px",
                                "cursor": "pointer"
                            }}
                        >
                            {"Save changes" if editing_id else "Add member"}
                        </button>
                        {editing_id and <button
                            onClick={lambda _e: MouseEvent { resetForm(); }}
                            style={{
                                "padding": "9px 14px",
                                "borderRadius": "3px",
                                "border": "1px solid #D0D5DD",
                                "background": "transparent",
                                "color": "#3D444C",
                                "fontSize": "12px",
                                "cursor": "pointer"
                            }}
                        >
                            Cancel
                        </button>}
                    </div>
                </div>
            </div>}
        </div>;
}
