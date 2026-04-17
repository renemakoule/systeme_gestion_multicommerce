; Script Inno Setup pour NexusControl (SuperAdmin)
; Permet une installation professionnelle avec gestion des droits admin et pare-feu

[Setup]
AppName=NexusControl
AppVersion=1.4.2
DefaultDirName={pf}\NexusControl
DefaultGroupName=NexusControl
OutputDir=dist/setup
OutputBaseFilename=NexusControl_Setup
Compression=lzma
SolidCompression=yes
PrivilegesRequired=admin
SetupIconFile=frontend\public\logo_nexuscontrol.png

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked

[Files]
Source: "dist\superadmin\win-unpacked\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs

[Icons]
Name: "{group}\NexusControl"; Filename: "{app}\NexusControl.exe"
Name: "{commondesktop}\NexusControl"; Filename: "{app}\NexusControl.exe"; Tasks: desktopicon

[Run]
; Configurer le pare-feu Windows pour le port 8001 au premier démarrage
Filename: "{sys}\netsh.exe"; \
    Parameters: "advfirewall firewall add rule name=""NexusControl Backend"" dir=in action=allow protocol=TCP localport=8001"; \
    Flags: runhidden; StatusMsg: "Optimisation de l'environnement réseau..."

Filename: "{app}\NexusControl.exe"; Description: "{cm:LaunchProgram,NexusControl}"; Flags: nowait postinstall skipifsilent
