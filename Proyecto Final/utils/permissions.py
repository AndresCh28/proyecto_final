STAFF_ROLES = {"Administrador", "Coordinador"}
ADMIN_ROLES = {"Administrador"}
VOTING_ROLES = {"Administrador", "Coordinador", "Miembro"}


def get_user_role(user: dict | None) -> str:
    if not user:
        return "Invitado"
    return (user.get("rol") or "Invitado").strip()


def has_any_role(user: dict | None, allowed_roles: set[str] | list[str] | tuple[str, ...]) -> bool:
    return get_user_role(user) in set(allowed_roles)


def can_manage_catalogs(user: dict | None) -> bool:
    return has_any_role(user, STAFF_ROLES)


def can_manage_finances(user: dict | None) -> bool:
    return has_any_role(user, STAFF_ROLES)


def can_manage_proposals(user: dict | None) -> bool:
    return has_any_role(user, STAFF_ROLES)


def can_vote(user: dict | None) -> bool:
    return has_any_role(user, VOTING_ROLES)

