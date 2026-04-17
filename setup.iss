; Script Inno Setup pour GASNexus
; Permet une installation professionnelle avec gestion des droits admin et pare-feu

[Setup]
AppName=GASNexus
AppVersion=1.4.0
DefaultDirName={pf}\GASNexus
DefaultGroupName=GASNexus
OutputDir=dist/setup
OutputBaseFilename=GASNexus_Setup
Compression=lzma
SolidCompression=yes
PrivilegesRequired=admin

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked

[Files]
Source: "dist\win-unpacked\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs

[Icons]
Name: "{group}\GASNexus"; Filename: "{app}\GASNexus.exe"
Name: "{commondesktop}\GASNexus"; Filename: "{app}\GASNexus.exe"; Tasks: desktopicon

[Run]
; Configurer le pare-feu Windows pour le port 8001 au premier démarrage
Filename: "{sys}\netsh.exe"; \
    Parameters: "advfirewall firewall add rule name=""GASNexus Backend"" dir=in action=allow protocol=TCP localport=8001"; \
    Flags: runhidden; StatusMsg: "Optimisation de l'environnement réseau..."

Filename: "{app}\GASNexus.exe"; Description: "{cm:LaunchProgram,GASNexus}"; Flags: nowait postinstall skipifsilent
