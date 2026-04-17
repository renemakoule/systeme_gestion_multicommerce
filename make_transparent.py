from PIL import Image

def make_transparent(image_path, output_path, tolerance=30):
    img = Image.open(image_path).convert("RGBA")
    data = img.getdata()
    
    new_data = []
    for item in data:
        # R, G, B values
        if item[0] < tolerance and item[1] < tolerance and item[2] < tolerance:
            new_data.append((0, 0, 0, 0)) # Transparent
        else:
            new_data.append(item)
            
    img.putdata(new_data)
    img.save(output_path, "PNG")

if __name__ == "__main__":
    make_transparent("frontend/public/logo_nexuscontrol.png", "frontend/public/logo_nexuscontrol.png")
    print("Background removed via pure python/PIL.")
