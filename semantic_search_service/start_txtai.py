#!/usr/bin/env python3
"""
Startup script for txtai API service with proper config loading.
"""
import os
import sys
from pathlib import Path

# Get the directory where this script is located
script_dir = Path(__file__).parent.absolute()
project_root = script_dir.parent
config_path = script_dir / "app.yml"

# Set environment variables
os.environ["KMP_DUPLICATE_LIB_OK"] = "TRUE"
os.environ["CONFIG"] = str(config_path)

print(f"Config file: {config_path}")
print(f"Config exists: {config_path.exists()}")
print(f"CONFIG env var: {os.environ.get('CONFIG')}")

# Verify config file exists
if not config_path.exists():
    print(f"ERROR: Config file not found at {config_path}")
    sys.exit(1)

# Import and run uvicorn
import uvicorn

if __name__ == "__main__":
    uvicorn.run(
        "txtai.api.application:app",
        host="0.0.0.0",
        port=8001,
        reload=False
    )
