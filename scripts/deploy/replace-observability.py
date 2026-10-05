"""Stage owned assets and retain the old directory without deleting its contents."""
import os
from pathlib import Path
import shutil
import stat
import sys
import tempfile

source, deploy, archive_parent = map(Path, sys.argv[1:])
active = deploy / 'observability'
if (not source.is_dir() or source.is_symlink() or active.is_symlink()
        or (active.exists() and not active.is_dir())):
    raise SystemExit('Invalid observability directory')
for root, dirs, files in os.walk(source):
    if any((Path(root) / name).is_symlink() for name in dirs + files):
        raise SystemExit('Symlinks are not supported in observability assets')
stage = Path(tempfile.mkdtemp(prefix='.observability-stage.', dir=deploy))
try:
    shutil.copytree(source, stage, dirs_exist_ok=True)
    # copytree retains modes, but not ownership. Only owner permissions change.
    for root, dirs, files in os.walk(stage):
        os.chmod(root, stat.S_IMODE(os.stat(root).st_mode) | 0o700)
        for name in files:
            file = Path(root) / name
            os.chmod(file, stat.S_IMODE(file.stat().st_mode) | 0o600)
    if active.exists():
        # Keep the same parent: moving a non-writable directory into another
        # parent would require permission to update its '..' entry.
        archived = Path(tempfile.mkdtemp(prefix='.observability-archived.', dir=deploy))
        archived.rmdir()
        (archive_parent / (archived.name + '.path')).write_text(str(archived) + '\n')
        active.rename(archived)
    try:
        stage.rename(active)
    except OSError:
        if 'archived' in locals():
            archived.rename(active)
        raise
finally:
    if stage.exists():
        for root, dirs, files in os.walk(stage):
            os.chmod(root, stat.S_IMODE(os.stat(root).st_mode) | 0o700)
        shutil.rmtree(stage)
