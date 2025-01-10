import os
import subprocess
import sys

os.system('sudo date')

VENV_DIR = ".venv"

def run_command(command, step_desc, step, total_steps):
    print(f"\n[{step}/16] {step_desc}")
    try:
        # Suppress output during normal execution
        subprocess.run(command, shell=True, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    except subprocess.CalledProcessError as e:
        print(f"Error running command: {e.cmd}\nReturn code: {e.returncode}")
        try:
            # Retry the command to show its output
            subprocess.run(command, shell=True, check=True)
        except subprocess.CalledProcessError as retry_error:
            print(f"Command failed again:\n{retry_error}")
        sys.exit(1)

def setup_virtualenv():
    if not os.path.exists(VENV_DIR):
        subprocess.run(f"python3 -m venv {VENV_DIR}", shell=True, check=True)
    activate_script = os.path.join(VENV_DIR, "bin", "activate")
    os.environ["VIRTUAL_ENV"] = VENV_DIR
    os.environ["PATH"] = f"{os.path.join(VENV_DIR, 'bin')}:{os.environ['PATH']}"

def install_tools():
    steps = [
        {
            "desc": "apt-get update",
            "commands": [
                "sudo apt update"             
            ],
        },
        {
            "desc": "Installing Curl",
            "commands": [
                "sudo apt install curl -y"              
            ],
        },
        {
            "desc": "Installing nodejs",
            "commands": [
                # "curl -fsSL https://deb.nodesource.com/setup_14.x | sudo -E bash -",
                "sudo apt install nodejs -y"
            ]
        },
        {
            "desc": "Installing npm",
            "commands": [
                "sudo apt install npm -y"
            ],
        },
        {
            "desc": "Installing npm modules",
            "commands": [
                "npm i"
            ],
        },
        {
            "desc": "Installing Joomscan",
            "commands": [
                "sudo apt install joomscan -y"
            ],
        },
        {
            "desc": "Installing WPScan",
            "commands": [
                f"sudo apt install wpscan"
            ],
        },
        {
            "desc": "Installing Arjun",
            "commands": [
                f"sudo apt install arjun"
            ],
        },
        {
            "desc": "Installing WaybackURLs",
            "commands": [
                f"go install github.com/tomnomnom/waybackurls@latest"
            ],
        },
        {
            "desc": "Installing FFUF",
            "commands": [
                f"sudo apt install ffuf -y"
            ],
        },
        {
            "desc": "Installing Nmap",
            "commands": [
                f"sudo apt install nmap -y"
            ],
        },
        {
            "desc": "Installing cewl",
            "commands": [
                f"sudo apt install cewl -y"
            ],
        },
        {
            "desc": "Installing gobuster",
            "commands": [
                f"sudo apt install gobuster -y"
            ],
        },
        {
            "desc": "Installing wafw00f",
            "commands": [
                f"sudo apt install wafw00f -y"
            ],
        },
        {
            "desc": "Installing dig",
            "commands": [
                f"sudo apt-get install dnsutils -y"
            ],
        },
        {
            "desc": "Installing dig",
            "commands": [
                f"sudo apt-get install dnsutils -y"
            ],
        },
    ]

    total_steps = len(steps)
    for idx, step in enumerate(steps, start=1):
        for command in step["commands"]:
            run_command(command, step["desc"], idx, total_steps)

# Add so it automatically adjusts the seclist paths for each system.
# def config():
#     input("Seclist Full Path: ")

if __name__ == "__main__":
    setup_virtualenv()
    install_tools()
    print("\n[+] Setup Completed, Run RASMATAZI using:\nnpm start")
    # config()
