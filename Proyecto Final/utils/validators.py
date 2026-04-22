def validate_login_fields(correo: str, password: str) -> tuple[bool, str]:
    if not correo or not correo.strip():
        return False, "Debes ingresar un correo."
    if "@" not in correo:
        return False, "El correo no tiene un formato valido."
    if not password:
        return False, "Debes ingresar una contrasena."
    if len(password) < 6:
        return False, "La contrasena debe tener al menos 6 caracteres."
    return True, ""
