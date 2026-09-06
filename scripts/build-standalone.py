"""Regenerate the offline preview from the same modules as the hosted app."""
from pathlib import Path
import re
root = Path(__file__).resolve().parent.parent
html = (root / 'index.html').read_text()
html = re.sub(r'  <meta http-equiv="Content-Security-Policy"[^>]+>\n', '', html)
html = html.replace('<link rel="stylesheet" href="./styles.css">', '<style>\n' + (root / 'styles.css').read_text() + '\n</style>')
modules = ['data.js', 'engine.js', 'presets.js', 'app.js']
script = '\n'.join(re.sub(r'^import .*?;\n', '', (root / name).read_text(), flags=re.M).replace('export ', '') for name in modules)
html = html.replace('<script type="module" src="./app.js"></script>', '<script>\n' + script + '\n</script>')
(root / 'preview-single-file.html').write_text(html)
