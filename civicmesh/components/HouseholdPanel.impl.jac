"""Impl helpers + HouseholdWalker spawn calls for HouseholdPanel."""

impl HouseholdPanel.loadMembers() -> None {
    is_loading = True;
    err = "";
    try {
        result = await root spawn HouseholdWalker(
            user_id=user_id,
            mode="list_members"
        );
        reports = result.reports if result.reports else [];
        if len(reports) > 0 {
            data: Any = reports[0];
            raw_members = data["members"];
            members = list(raw_members) if raw_members else [];
        }
    } except Exception as _ex {
        err = "Couldn't load household members";
    }
    is_loading = False;
}

impl HouseholdPanel.submitMember() -> None {
    is_loading = True;
    err = "";
    age_int = 0;
    try {
        if form_age {
            age_int = int(form_age);
        }
    } except Exception as _ex {
        age_int = 0;
    }
    try {
        if editing_id {
            await root spawn HouseholdWalker(
                user_id=user_id,
                mode="update_member",
                member_id=editing_id,
                relationship=form_relationship,
                age=age_int,
                immigration_status=form_status,
                has_disability=form_disability
            );
        } else {
            await root spawn HouseholdWalker(
                user_id=user_id,
                mode="add_member",
                relationship=form_relationship,
                age=age_int,
                immigration_status=form_status,
                has_disability=form_disability
            );
        }
        resetForm();
        await loadMembers();
    } except Exception as _ex {
        err = "Couldn't save that member — try again";
    }
    is_loading = False;
}

impl HouseholdPanel.removeMember(member_id: str) -> None {
    try {
        await root spawn HouseholdWalker(
            user_id=user_id,
            mode="remove_member",
            member_id=member_id
        );
        members = [m for m in members if str(m["member_id"]) != member_id];
    } except Exception as _ex {
        err = "Couldn't remove that member — try again";
    }
}

impl HouseholdPanel.startEdit(m: dict) -> None {
    editing_id = str(m["member_id"]);
    form_relationship = str(m["relationship"]) if m["relationship"] else "dependent";
    form_status = str(m["immigration_status"]) if m["immigration_status"] else "unspecified";
    form_disability = bool(m["has_disability"]) if m["has_disability"] else False;
    age_raw = m["age"];
    form_age = str(age_raw) if age_raw else "";
}

impl HouseholdPanel.resetForm() -> None {
    editing_id = "";
    form_relationship = "dependent";
    form_age = "";
    form_status = "unspecified";
    form_disability = False;
}

impl HouseholdPanel.relationshipLabel(rel: str) -> str {
    if rel == "spouse" { return "Spouse"; }
    if rel == "child" { return "Child"; }
    if rel == "parent" { return "Parent"; }
    if rel == "dependent" { return "Dependent"; }
    return "Other";
}

impl HouseholdPanel.renderMemberRow(m: dict) -> JsxElement {
    member_id = str(m["member_id"]) if m["member_id"] else "";
    relationship = str(m["relationship"]) if m["relationship"] else "dependent";
    age = m["age"];
    age_str = str(age) if age else "unspecified age";
    status = str(m["immigration_status"]) if m["immigration_status"] else "unspecified";
    has_disability = bool(m["has_disability"]) if m["has_disability"] else False;

    return
        <div
            key={member_id}
            style={{
                "padding": "9px 11px",
                "background": "#F2F4F7",
                "borderRadius": "8px",
                "display": "flex",
                "alignItems": "center",
                "gap": "8px"
            }}
        >
            <span style={{"width": "6px", "height": "6px", "borderRadius": "50%", "background": "#1B4B43", "flexShrink": "0"}}/>
            <div style={{"flex": "1"}}>
                <div style={{"fontSize": "12px", "color": "#1A1D1F"}}>
                    {relationshipLabel(relationship) + " · " + age_str}
                </div>
                <div style={{"fontSize": "11px", "color": "#8B949A", "marginTop": "1px"}}>
                    {status + (" · flagged for disability-related programs" if has_disability else "")}
                </div>
            </div>
            <button
                onClick={lambda _e: MouseEvent { startEdit(m); }}
                style={{
                    "background": "transparent",
                    "border": "none",
                    "color": "#8B949A",
                    "cursor": "pointer",
                    "fontSize": "11px",
                    "padding": "4px 6px"
                }}
            >
                Edit
            </button>
            <button
                onClick={lambda _e: MouseEvent { removeMember(member_id); }}
                style={{
                    "background": "transparent",
                    "border": "none",
                    "color": "#B8BFC7",
                    "cursor": "pointer",
                    "fontSize": "14px",
                    "padding": "4px 6px",
                    "lineHeight": "1"
                }}
            >
                ×
            </button>
        </div>;
}
