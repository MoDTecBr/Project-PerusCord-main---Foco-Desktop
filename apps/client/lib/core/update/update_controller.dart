import 'dart:io';

import 'package:desktop_updater/desktop_updater.dart';
import 'package:path_provider/path_provider.dart';

import '../config/env.dart';
import 'update_recovery_store.dart';

/// Chaves públicas de assinatura de release (saída de
/// `dart run desktop_updater:release keygen`, dentro de apps/client).
/// Só a chave PÚBLICA fica aqui — a privada nunca entra no repositório.
const Map<String, String> trustedReleasePublicKeys = <String, String>{
  'release-8498a354bb36c982fc25cafd': 'Yy4R+pLDdwhv1jm2/2VrBKQFmqT5jfgateQXGwfeOp8=',
};

/// Monta o controller de auto-update do app desktop (Windows). Só deve ser
/// usado quando `Platform.isWindows` — em outras plataformas o app ainda
/// não publica releases via `desktop_updater`.
Future<DesktopUpdaterController> createDesktopUpdaterController() async {
  final supportDir = await getApplicationSupportDirectory();

  return DesktopUpdaterController(
    appArchiveUrl: Uri.parse(Env.updateArchiveUrl),
    expectedPackageId: 'relay_client',
    trustedReleasePublicKeys: trustedReleasePublicKeys,
    recoveryStore: JsonFileUpdateRecoveryStore(
      File('${supportDir.path}${Platform.pathSeparator}desktop_updater${Platform.pathSeparator}pending-install.json'),
    ),
  );
}
