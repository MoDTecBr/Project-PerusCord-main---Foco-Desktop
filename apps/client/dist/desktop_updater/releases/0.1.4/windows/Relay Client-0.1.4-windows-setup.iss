#define MyAppName "Relay Client"
#define MyAppVersion "0.1.4"
[Setup]
AppId={{8C6E7A27-C54E-4B9E-B243-BEBE8F8E769E}}
AppName=Relay Client
AppVersion=0.1.4
AppPublisher=Relay Team
DefaultDirName={autopf}\Relay Client
DefaultGroupName=Relay Client
DisableProgramGroupPage=yes
OutputDir=C:\Users\Dudu\Downloads\Project-PerusCord-main - Foco Desktop\apps\client\dist\desktop_updater\releases\0.1.4\windows
OutputBaseFilename=Relay Client-0.1.4-windows-setup
Compression=lzma2
SolidCompression=yes
WizardStyle=modern
PrivilegesRequired=lowest
ArchitecturesAllowed=x64
ArchitecturesInstallIn64BitMode=x64
SetupIconFile=windows\runner\resources\app_icon.ico

[Files]
Source: "C:\Users\Dudu\Downloads\Project-PerusCord-main - Foco Desktop\apps\client\build\windows\x64\runner\Release\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "C:\Users\Dudu\Downloads\Project-PerusCord-main - Foco Desktop\apps\client\dist\desktop_updater\releases\0.1.4\windows\Relay Client-0.1.4-windows-setup.install-identity.json"; DestDir: "{app}"; DestName: ".desktop_updater_install_identity.json"; Flags: ignoreversion

[Registry]
Root: HKA; Subkey: "Software\Microsoft\Windows\CurrentVersion\Uninstall\{#SetupSetting('AppId')}_is1"; ValueType: string; ValueName: "DesktopUpdaterPackageId"; ValueData: "relay_client"; Flags: uninsdeletevalue
Root: HKA; Subkey: "Software\Microsoft\Windows\CurrentVersion\Uninstall\{#SetupSetting('AppId')}_is1"; ValueType: string; ValueName: "InstallLocation"; ValueData: "{app}"; Flags: uninsdeletevalue

[Icons]
Name: "{autoprograms}\Relay Client"; Filename: "{app}\Relay Client.exe"

[Run]
Filename: "{app}\Relay Client.exe"; Description: "{cm:LaunchProgram,Relay Client}"; Flags: nowait postinstall skipifsilent
