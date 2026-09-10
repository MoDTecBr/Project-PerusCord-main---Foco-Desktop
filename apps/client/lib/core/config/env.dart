/// Configuração de ambiente do app. Sobrescreva em build/run com:
///   flutter run --dart-define=API_BASE_URL=http://10.0.2.2:3000
///
/// Notas por plataforma (dev local, API rodando em localhost:3000):
/// - Windows/macOS/iOS Simulator/Web: `localhost` funciona normalmente.
/// - Emulador Android: o emulador tem sua própria rede virtual — use
///   `10.0.2.2` no lugar de `localhost` para alcançar a máquina host.
/// - Celular físico: use o IP da máquina na rede local (ex: 192.168.x.x).
class Env {
  const Env._();

  static const String apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://191.183.194.228:3000',
  );

  static const String wsBaseUrl = String.fromEnvironment(
    'WS_BASE_URL',
    defaultValue: apiBaseUrl,
  );

  /// Onde o auto-update (pacote `desktop_updater`) busca o índice assinado
  /// de releases — servido pela própria API (ver apps/api/src/releases).
  /// Precisa bater com `updates.baseUrl` em `desktop_updater.yaml`.
  static const String updateArchiveUrl = '$apiBaseUrl/releases/app-archive.json';
}
