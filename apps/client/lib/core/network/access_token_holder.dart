/// Cópia em memória do access token atual, compartilhada entre o
/// `ApiClient` (que só lê, para montar o header) e o `AuthController` (que
/// escreve, ao logar/renovar/deslogar). Existir separado do `ApiClient`
/// evita uma dependência circular entre ele e o `AuthController`.
class AccessTokenHolder {
  String? current;
}
