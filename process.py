import os
import re

files = [
    ('landing-prototype.html', '.stitch/designs/landing-prototype.html'),
    ('dashboard-prototype.html', '.stitch/designs/dashboard-prototype.html'),
    ('invoice-builder-prototype.html', '.stitch/designs/invoice-builder-prototype.html'),
    ('invoice-detail-prototype.html', '.stitch/designs/invoice-detail-prototype.html')
]

extra_styles = """
<style>
/* Responsive Breakpoints & Focus States injected by build step */
*:focus-visible { outline: 2px solid #178dee !important; outline-offset: 2px !important; }
@media (prefers-reduced-motion: reduce) { * { transition: none !important; } }

/* Mobile adjustments */
@media (max-width: 767px) {
    body { font-size: 14px; }
    .grid { display: flex !important; flex-direction: column !important; }
    .flex-row { flex-direction: column !important; }
    .w-64, .w-60 { width: 100% !important; position: static !important; }
    button, a { min-height: 44px; }
    /* Hide specific desktop elements */
    .hidden.md\\\\:flex { display: none !important; }
}

/* Tablet adjustments */
@media (min-width: 768px) and (max-width: 1279px) {
    .grid { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
    .w-64, .w-60 { width: 200px !important; }
}
</style>
"""

for dest, src in files:
    if not os.path.exists(src):
        print(f"File not found: {src}")
        continue
    
    with open(src, 'r', encoding='utf-8') as f:
        html = f.read()

    # Ensure viewport meta is present
    if '<meta name="viewport"' not in html and '<meta content="width=device-width, initial-scale=1.0" name="viewport"' not in html:
        html = html.replace('<head>', '<head>\n<meta name="viewport" content="width=device-width, initial-scale=1">')

    # Add extra styles before </head>
    if '</head>' in html:
        html = html.replace('</head>', f'{extra_styles}\n</head>')

    # Fix absolute asset paths (e.g., /assets/ or similar)
    html = re.sub(r'src="(/[^/].*?)"', r'src=".\1"', html)
    html = re.sub(r'href="(/[^/].*?\.css)"', r'href=".\1"', html)

    # Specific fix for landing page hero mockup screenshot
    if dest == 'landing-prototype.html':
        # Let's replace the placeholder image with the app-prototype screenshot if it exists, or just use dashboard-prototype.png
        # The prompt says "Include a product screenshot/mockup area using the app-prototype screenshot if it exists"
        # We know we have .stitch/designs/dashboard-prototype.png
        html = re.sub(r'src="[^"]*images\.unsplash[^"]*"', r'src=".stitch/designs/dashboard-prototype.png"', html)

    with open(dest, 'w', encoding='utf-8') as f:
        f.write(html)
    print(f"Processed {dest}")
