from __future__ import annotations

from pathlib import Path


def main() -> None:
    root_dir = Path(__file__).resolve().parent
    project_dir = root_dir / "finance_hub"

    print("Le projet a lancer se trouve dans :")
    print(f"  {project_dir}")
    print()
    print("Depuis cette racine, utilise :")
    print("  start.bat")
    print("ou")
    print("  powershell -ExecutionPolicy Bypass -File .\\start.ps1")
    print()
    print("Si le setup n'est pas encore fait :")
    print("  1. python -m venv finance_hub\\.venv")
    print("  2. finance_hub\\.venv\\Scripts\\python -m pip install -r finance_hub\\requirements.txt")
    print("  3. cd finance_hub\\frontend")
    print("  4. npm ci")


if __name__ == "__main__":
    main()
