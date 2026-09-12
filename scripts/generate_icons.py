import os
from PIL import Image

def generate_all_icons():
    src_path = os.path.join('logosDP', 'logocotizador.jpeg')
    if not os.path.exists(src_path):
        raise FileNotFoundError(f"No se encontró el logo fuente en {src_path}")

    # Cargar imagen fuente original
    im = Image.open(src_path).convert('RGB')
    bg_color = im.getpixel((0, 0)) # (2, 2, 2) negro profundo idéntico al logo

    # Asegurar carpetas de destino
    os.makedirs('assets', exist_ok=True)
    os.makedirs('icons', exist_ok=True)

    # 1. Iconos Estándar PWA & App (Proporción 100% original, sin deformaciones)
    sizes = {
        'icon-512.png': 512,
        'icon-192.png': 192,
        'apple-touch-icon.png': 180,
        'favicon-32x32.png': 32,
        'favicon-16x16.png': 16,
        'logocotizador.png': 512
    }

    for filename, size in sizes.items():
        resized = im.resize((size, size), Image.Resampling.LANCZOS)
        # Guardar en assets
        resized.save(os.path.join('assets', filename), 'PNG', optimize=True)
        # Sincronizar en icons si corresponde
        if filename in ['icon-512.png', 'icon-192.png', 'apple-touch-icon.png', 'favicon-32x32.png']:
            resized.save(os.path.join('icons', filename), 'PNG', optimize=True)
        print(f"[OK] Generado: {filename} ({size}x{size})")

    # 2. Iconos Maskable para Android (Con margen seguro para evitar recortes en círculos/squircles)
    for s in [512, 192]:
        content_size = int(s * 0.85)
        offset = (s - content_size) // 2
        content_resized = im.resize((content_size, content_size), Image.Resampling.LANCZOS)
        maskable_canvas = Image.new('RGB', (s, s), bg_color)
        maskable_canvas.paste(content_resized, (offset, offset))
        
        maskable_name = f'icon-maskable-{s}.png'
        maskable_canvas.save(os.path.join('assets', maskable_name), 'PNG', optimize=True)
        maskable_canvas.save(os.path.join('icons', maskable_name), 'PNG', optimize=True)
        print(f"[OK] Generado Maskable: {maskable_name} ({s}x{s} con zona segura 85%)")

    # 3. Favicon ICO Multi-resolución (16, 32, 48, 64)
    im.save('favicon.ico', format='ICO', sizes=[(16, 16), (32, 32), (48, 48), (64, 64)])
    im.save(os.path.join('assets', 'favicon.ico'), format='ICO', sizes=[(16, 16), (32, 32), (48, 48), (64, 64)])
    im.save(os.path.join('icons', 'favicon.ico'), format='ICO', sizes=[(16, 16), (32, 32), (48, 48), (64, 64)])
    print("[OK] Generado: favicon.ico (multi-resolución 16, 32, 48, 64)")

    print("\nTodos los iconos de DUNES PARFUMS fueron generados con éxito a partir de logocotizador.jpeg.")

if __name__ == '__main__':
    generate_all_icons()
