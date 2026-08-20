import os
import zipfile
import hashlib
from datetime import datetime

WORKSPACE_ROOT = os.path.abspath(".")
ZIP_NAME = "RELAY_GEMINI_HANDOFF.zip"
MANIFEST_NAME = "RELAY_GEMINI_HANDOFF_MANIFEST.txt"
SHA256_NAME = "RELAY_GEMINI_HANDOFF_SHA256.txt"
INFO_NAME = "RELAY_GEMINI_HANDOFF_INFO.md"

EXCLUDE_DIRS = {
    "node_modules",
    "dist",
    ".git",
    ".relay",
    ".cache",
    ".tmp",
    "__pycache__",
    ".system_generated",
    ".aistudio"
}

EXCLUDE_FILES = {
    ZIP_NAME,
    MANIFEST_NAME,
    SHA256_NAME,
    INFO_NAME,
    ".relay_git_sync_state.json",
    ".DS_Store"
}

def should_include(rel_path):
    parts = rel_path.split(os.sep)
    for p in parts:
        if p in EXCLUDE_DIRS:
            return False
    filename = os.path.basename(rel_path)
    if filename in EXCLUDE_FILES or filename.endswith(".zip") or filename.endswith(".sqlite") or filename.endswith(".sqlite-journal"):
        return False
    return True

def get_all_files():
    included = []
    for root, dirs, files in os.walk(WORKSPACE_ROOT):
        dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS]
        for file in files:
            full_path = os.path.join(root, file)
            rel_path = os.path.relpath(full_path, WORKSPACE_ROOT)
            if should_include(rel_path):
                included.append(rel_path)
    included.sort()
    return included

def create_zip(files):
    with zipfile.ZipFile(ZIP_NAME, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as zipf:
        for rel_path in files:
            full_path = os.path.join(WORKSPACE_ROOT, rel_path)
            zipf.write(full_path, rel_path)
    print(f"Created {ZIP_NAME} with {len(files)} files.")

def compute_sha256(filepath):
    h = hashlib.sha256()
    with open(filepath, "rb") as f:
        while chunk := f.read(65536):
            h.update(chunk)
    return h.hexdigest()

def generate_manifest(files):
    with open(MANIFEST_NAME, "w", encoding="utf-8") as f:
        f.write(f"# RELAY GEMINI HANDOFF MANIFEST\n")
        f.write(f"# Generated: {datetime.utcnow().isoformat()}Z\n")
        f.write(f"# Total Files: {len(files)}\n\n")
        for rel_path in files:
            full_path = os.path.join(WORKSPACE_ROOT, rel_path)
            size = os.path.getsize(full_path)
            sha = compute_sha256(full_path)
            f.write(f"{sha}  {size:>10} bytes  {rel_path}\n")
    print(f"Created {MANIFEST_NAME}.")

def generate_sha256_file():
    zip_sha = compute_sha256(ZIP_NAME)
    with open(SHA256_NAME, "w", encoding="utf-8") as f:
        f.write(f"{zip_sha}  {ZIP_NAME}\n")
    print(f"Created {SHA256_NAME}: {zip_sha}")
    return zip_sha

def main():
    files = get_all_files()
    create_zip(files)
    generate_manifest(files)
    zip_sha = generate_sha256_file()
    print("Packaging complete.")

if __name__ == "__main__":
    main()
