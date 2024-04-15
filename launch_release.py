import subprocess

# Définir les commandes à exécuter
python_command = "cd release/apps/lol_picksandbans/web && python server.py"
dotnet_command = "cd release && dotnet LWOServer.dll"

# Lancer les deux commandes en parallèle
python_process = subprocess.Popen(python_command, shell=True)
dotnet_process = subprocess.Popen(dotnet_command, shell=True)

# Attendre que les deux processus se terminent
python_process.communicate()
dotnet_process.communicate()