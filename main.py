from __future__ import annotations

from pathlib import Path


def main() -> None:
    root_dir = Path(__file__).resolve().parent
    project_dir = root_dir / "finance_hub"
    archive_dir = root_dir / "archive"

    print("Projet principal :")
    print(f"  {project_dir}")
    print()
    print("Depuis cette racine :")
    print("  FinanceHub.bat")
    print()
    print("Scripts techniques si besoin :")
    print("  tools\\windows\\setup.bat")
    print("  tools\\windows\\start.bat")
    print()
    print("Version PowerShell technique :")
    print("  powershell -ExecutionPolicy Bypass -File .\\tools\\windows\\setup.ps1")
    print("  powershell -ExecutionPolicy Bypass -File .\\tools\\windows\\start.ps1")
    print()
    print("Archive perso separee :")
    print(f"  {archive_dir}")
    print("Le flux principal de travail se concentre uniquement sur finance_hub.")


if __name__ == "__main__":
    main()
