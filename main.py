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
    print("  1. setup.bat")
    print("  2. start.bat")
    print()
    print("Version PowerShell :")
    print("  powershell -ExecutionPolicy Bypass -File .\\setup.ps1")
    print("  powershell -ExecutionPolicy Bypass -File .\\start.ps1")
    print()
    print("Archive perso separee :")
    print(f"  {archive_dir}")
    print("Le flux principal de travail se concentre uniquement sur finance_hub.")


if __name__ == "__main__":
    main()
