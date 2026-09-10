import 'dart:async';
import 'dart:io';
import 'package:desktop_updater/desktop_updater.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:launch_at_startup/launch_at_startup.dart';
import 'package:package_info_plus/package_info_plus.dart';

import 'core/network/network_providers.dart';
import 'core/realtime/realtime_providers.dart';
import 'core/router/app_router.dart';
import 'core/theme/app_theme.dart';
import 'core/update/update_controller.dart';
import 'features/auth/application/auth_controller.dart';

/// Intervalo entre checagens automáticas de atualização enquanto o app fica
/// aberto (o Discord também revalida periodicamente em segundo plano).
const _updateCheckInterval = Duration(minutes: 30);


void main() async {
  // 1. Inicializa o motor do Flutter antes de rodar código nativo assíncrono
  WidgetsFlutterBinding.ensureInitialized();

  // O cache de imagens decodificadas do Flutter (avatares, anexos do chat)
  // não tem limite realista por padrão (100MB) para um app que fica aberto
  // o dia inteiro trocando muita imagem — baixamos o teto pra segurar o
  // consumo de RAM sem descartar imagem em uso. Quem quiser esvaziar na
  // hora tem o botão em Meu Perfil (`UserProfileDialog._clearImageCache`).
  PaintingBinding.instance.imageCache.maximumSizeBytes = 48 << 20;

  // 2. Configura a inicialização junto com o sistema operacional (Item 4)
  if (!kIsWeb && (Platform.isWindows || Platform.isLinux)) {
    PackageInfo packageInfo = await PackageInfo.fromPlatform();
    
    LaunchAtStartup.instance.setup(
      appName: packageInfo.appName,
      appPath: Platform.resolvedExecutable,
    );
    
    await LaunchAtStartup.instance.enable();
  }

  // 3. Inicializa o aplicativo
  runApp(const ProviderScope(child: RelayApp()));
}

class RelayApp extends ConsumerStatefulWidget {
  const RelayApp({super.key});

  @override
  ConsumerState<RelayApp> createState() => _RelayAppState();
}

class _RelayAppState extends ConsumerState<RelayApp> {
  Timer? _updateCheckTimer;
  bool _updateDialogShowing = false;

  @override
  void initState() {
    super.initState();
    // Auto-update só existe pro build nativo Windows por enquanto — é a
    // única plataforma com publish configurado (ver
    // apps/client/desktop_updater.yaml e docs/plans do pacote desktop_updater).
    if (!kIsWeb && Platform.isWindows) {
      unawaited(_setupUpdateController());
    }
  }

  Future<void> _setupUpdateController() async {
    final controller = await createDesktopUpdaterController();
    if (!mounted) return;
    controller.addListener(() => _maybeShowUpdateDialog(controller));
    // Atraso proposital: checar (e, se houver update, tentar abrir o diálogo)
    // imediatamente no boot corre com o redirect inicial do GoRouter
    // (`/splash` -> `/login` ou `/home`), que reseta a pilha de navegação e
    // fecha o diálogo junto, no mesmo instante — invisível pro usuário. Dar
    // um tempo pro redirect inicial assentar antes evita essa corrida.
    Future.delayed(const Duration(seconds: 4), () {
      if (mounted) unawaited(controller.checkVersion());
    });
    _updateCheckTimer = Timer.periodic(
      _updateCheckInterval,
      (_) => unawaited(controller.checkVersion()),
    );
  }

  /// Mostra um aviso simples (nosso, não o diálogo pronto do pacote) com um
  /// link pra baixar o instalador manualmente.
  ///
  /// Não usamos o fluxo padrão do pacote (checar → baixar → "Restart to
  /// update") porque `restartApp()` exige verificação Authenticode de um
  /// `desktop_updater_install_helper.exe` assinado numa localização fixa —
  /// sem certificado de assinatura de código, essa etapa sempre falha com
  /// "cannot open fixed helper executable" (ou, em builds antigas, "Bad
  /// state: Staged update has already been claimed for dispatch" numa
  /// segunda tentativa sobre o mesmo estado já corrompido). `checkVersion()`
  /// sozinho funciona bem — só a etapa de auto-instalação nativa que exige
  /// infra que não temos. Por isso: aviso automático, instalação manual.
  ///
  /// Usa `rootNavigatorKey` em vez do `context` que o `builder` de
  /// `MaterialApp.router` fornece — aquele `context` é IRMÃO do Router (não
  /// descendente dele), então `showDialog` com ele falha com "Null check
  /// operator used on a null value" (sem Navigator visível ali).
  void _maybeShowUpdateDialog(DesktopUpdaterController controller) {
    if (_updateDialogShowing || controller.skipUpdate) return;
    if (controller.state is! UpdateAvailable) return;

    final descriptor = controller.activeDescriptor;
    if (descriptor == null) return;

    final context = rootNavigatorKey.currentContext;
    if (context == null) return;

    _updateDialogShowing = true;
    unawaited(
      showDialog<void>(
        context: context,
        builder: (context) => AlertDialog(
          title: const Text('Atualização disponível'),
          content: Text(
            '${descriptor.appName} ${descriptor.version} já está disponível. '
            'Baixe o instalador e rode-o pra atualizar (o app não atualiza sozinho).',
          ),
          actions: [
            TextButton(
              onPressed: () {
                unawaited(controller.makeSkipUpdate());
                Navigator.of(context).pop();
              },
              child: const Text('Pular esta versão'),
            ),
            TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('Depois'),
            ),
            FilledButton(
              onPressed: () {
                unawaited(defaultExternalUrlLauncher(descriptor.artifact.url));
                Navigator.of(context).pop();
              },
              child: const Text('Baixar instalador'),
            ),
          ],
        ),
      ).whenComplete(() {
        _updateDialogShowing = false;
      }),
    );
  }

  @override
  void dispose() {
    _updateCheckTimer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final router = ref.watch(goRouterProvider);

    // Liga/desliga o socket realtime conforme a sessão muda — assim ele
    // conecta assim que o login/registro resolve e cai limpo no logout,
    // não importa em qual tela o usuário está.
    ref.listen<AuthState>(authControllerProvider, (previous, next) {
      final realtime = ref.read(realtimeClientProvider);
      if (next is AuthAuthenticated) {
        final token = ref.read(accessTokenHolderProvider).current;
        if (token != null) realtime.connect(token);
      } else if (next is AuthUnauthenticated) {
        realtime.disconnect();
      }
    });

    return MaterialApp.router(
      title: 'Relay',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light(),
      darkTheme: AppTheme.dark(),
      themeMode: ThemeMode.system,
      routerConfig: router,
    );
  }
}