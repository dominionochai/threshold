"""HouseholdWalker — manages the household members attached to a PersonNode.

CivicMesh's PersonNode carries a flattened family_size: int. That's enough
for programs that only check headcount, but real eligibility rules often
depend on facts about a SPECIFIC member: WIC needs a child's age, mixed-
status households need to know which members are citizens/LPR/undocumented
so eligible members aren't excluded by one member's status, disability-
specific housing needs to know which member has the disability.

This walker lets the client add, update, or list HouseholdMemberNodes under
the case's PersonNode. EligibilityWalker (see eligibility.jac) reads these
alongside the flattened profile fields — the flattened fields remain the
fast-path default; per-member nodes sharpen specific rule checks when they
exist.

Modes:
  "add_member"    — create a new HouseholdMemberNode under this PersonNode
  "update_member" — patch fields on an existing member by member_id
  "remove_member" — soft-delete a member (case-correction, not a real
                     deletion of history — the node and its member_of
                     edge stay; removed=True excludes it from
                     list_members and EligibilityWalker)
  "list_members"  — return all non-removed members for the household panel UI
"""

import datetime;
import uuid;
import from graph.nodes { PersonNode, HouseholdMemberNode }
import from graph.edges { member_of }


walker HouseholdWalker {
    has user_id: str;
    has mode: str;
    has member_id: str = "";
    has relationship: str = "dependent";
    has age: int = 0;
    has immigration_status: str = "unspecified";
    has has_disability: bool = False;
    has summary: dict = {};

    can locate with `Root entry {
        matches = [root --> [?:PersonNode, user_id == self.user_id]];
        # Explicit length check — `not matches` is unreliable on JS empty
        # arrays in this runtime (always truthy regardless of length),
        # same caution MemoryWalker already takes.
        if len(matches) == 0 {
            report {"error": "No session found", "is_new_user": True};
            disengage;
        }
        visit matches[0];
    }

    can handle with PersonNode entry {
        ts = datetime.datetime.utcnow().isoformat();

        if self.mode == "add_member" {
            new_member = HouseholdMemberNode(
                member_id=str(uuid.uuid4()),
                relationship=self.relationship,
                age=self.age,
                immigration_status=self.immigration_status,
                has_disability=self.has_disability,
                is_primary_applicant=False,
                created_at=ts
            );
            here +>: member_of() :+> new_member;
            payload = {
                "member_id": new_member.member_id,
                "relationship": new_member.relationship,
                "age": new_member.age,
                "immigration_status": new_member.immigration_status,
                "has_disability": new_member.has_disability
            };
            self.summary = payload;
            report payload;
            disengage;
        }

        if self.mode == "update_member" {
            targets = [here ->:member_of:-> [?:HouseholdMemberNode, member_id == self.member_id]];
            if len(targets) == 0 {
                report {"error": "Member not found"};
                disengage;
            }
            m = targets[0];
            m.relationship = self.relationship;
            m.age = self.age;
            m.immigration_status = self.immigration_status;
            m.has_disability = self.has_disability;
            payload = {
                "member_id": m.member_id,
                "relationship": m.relationship,
                "age": m.age,
                "immigration_status": m.immigration_status,
                "has_disability": m.has_disability
            };
            self.summary = payload;
            report payload;
            disengage;
        }

        if self.mode == "remove_member" {
            targets = [here ->:member_of:-> [?:HouseholdMemberNode, member_id == self.member_id]];
            if len(targets) == 0 {
                report {"error": "Member not found"};
                disengage;
            }
            # No proven edge-deletion pattern exists elsewhere in this
            # codebase to build on, so removal is a soft-delete flag
            # instead: the node and member_of edge stay in the graph,
            # but list_members (below) and EligibilityWalker both skip
            # any member with removed == True.
            targets[0].removed = True;
            report {"removed": self.member_id};
            disengage;
        }

        if self.mode == "list_members" {
            members = [here ->:member_of:-> [?:HouseholdMemberNode, removed == False]];
            member_list: list = [];
            for m in members {
                member_list.append({
                    "member_id": m.member_id,
                    "relationship": m.relationship,
                    "age": m.age,
                    "immigration_status": m.immigration_status,
                    "has_disability": m.has_disability
                });
            }
            payload = {"members": member_list, "count": len(member_list)};
            self.summary = payload;
            report payload;
            disengage;
        }

        report {"error": "Unknown mode: " + str(self.mode)};
    }
}

sem HouseholdWalker is "CRUD over HouseholdMemberNodes attached to a case's PersonNode. Exposed as a REST endpoint for the household panel UI. Read by EligibilityWalker to sharpen per-member eligibility checks (a child's age for WIC, a specific member's immigration status in a mixed-status household) beyond what the flattened PersonNode.family_size int alone can express.";
sem HouseholdWalker.mode is "One of: 'add_member', 'update_member', 'remove_member', 'list_members'.";
sem HouseholdWalker.summary is "Mirror of the final report payload for sibling walkers that spawn this one.";
