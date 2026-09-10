; Instalador Windows (.exe) do Relay — empacota o build nativo do Flutter
; (`flutter build windows --release`) com o Inno Setup.
;
; Dois jeitos de compilar:
; 1) Direto: ISCC.exe windows\installer\relay_client.iss (rode a partir de
;    apps/client) — usa os caminhos relativos abaixo.
; 2) Via `dart run desktop_updater:release publish --platform windows`
;    (windows.installer.mode: script em desktop_updater.yaml) — a CLI copia
;    este arquivo pra outra pasta antes de compilar, por isso ReleaseDir e
;    SetupIconFile precisam ser absolutos (senão quebram nesse modo); já
;    OutputDir usa {#SourcePath}, que sempre aponta pra onde o .iss ESTÁ na
;    hora da compilação, então funciona nos dois modos.
#define MyAppName "Relay"
#define MyAppVersion "0.1.4"
#define MyAppPublisher "Relay Team"
#define MyAppExeName "relay_client.exe"
#define ProjectRoot "C:\Users\Dudu\Downloads\Project-PerusCord-main - Foco Desktop\apps\client"
#define ReleaseDir ProjectRoot + "\build\windows\x64\runner\Release"

[Setup]
AppId={{8C6E7A27-C54E-4B9E-B243-BEBE8F8E769E}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
; Instalação por usuário (não em Program Files): necessário para o
; auto-update (pacote desktop_updater) substituir os arquivos sozinho sem
; pedir UAC a cada atualização — é assim que o Discord também instala
; (%LOCALAPPDATA%\Discord).
DefaultDirName={localappdata}\{#MyAppName}
PrivilegesRequired=lowest
DefaultGroupName={#MyAppName}
DisableProgramGroupPage=yes
UninstallDisplayIcon={app}\{#MyAppExeName}
OutputDir={#SourcePath}
OutputBaseFilename=RelaySetup
SetupIconFile={#ProjectRoot}\windows\runner\resources\app_icon.ico
Compression=lzma2/max
SolidCompression=yes
WizardStyle=modern
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible

[Languages]
Name: "brazilianportuguese"; MessagesFile: "compiler:Languages\BrazilianPortuguese.isl"

[Tasks]
Name: "desktopicon"; Description: "Criar atalho na área de trabalho"; GroupDescription: "Atalhos adicionais:"

[Files]
Source: "{#ReleaseDir}\{#MyAppExeName}"; DestDir: "{app}"; Flags: ignoreversion
Source: "{#ReleaseDir}\*.dll"; DestDir: "{app}"; Flags: ignoreversion
Source: "{#ReleaseDir}\data\*"; DestDir: "{app}\data"; Flags: ignoreversion recursesubdirs createallsubdirs
; Exigido pelo desktop_updater em "custom script mode" (docs/windows-inno-
; installer-updates.md): marca a instalação como gerenciada por Inno pra
; validações nativas de update futuras.
Source: "{#ProjectRoot}\windows\installer\desktop_updater_install_identity.json"; DestDir: "{app}"; DestName: ".desktop_updater_install_identity.json"; Flags: ignoreversion

[Icons]
Name: "{group}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"
Name: "{group}\Desinstalar {#MyAppName}"; Filename: "{uninstallexe}"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; Tasks: desktopicon

[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "Abrir {#MyAppName} agora"; Flags: nowait postinstall skipifsilent
