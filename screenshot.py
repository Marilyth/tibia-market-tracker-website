import pytesseract
from PIL import ImageGrab, Image, ImageDraw
import os

def take_screenshot(left, top, width, height) -> Image.Image:
    """
    Takes a screenshot of the given screen coordinates, and returns the PIL.Image.
    """
    return ImageGrab.grab((left, top, width, height))

def process_image(image: Image.Image, relative_box: tuple[int, int, int, int] = None) -> Image.Image:
    """
    Converts the image into a more AI readable format. The endresult can be seen under selection_showcase.png and ai_image_input.png.
    relative_box in this format (relative_left, relative_top, relative_width, relative_height).
    """
    bbox = image.getbbox()
    crop_box = bbox if relative_box is None else (bbox[0] + (bbox[2] - bbox[0]) * (1 - relative_box[0]), 
                                                  bbox[1] + (bbox[-1] - bbox[1]) * (1 - relative_box[1]), 
                                                  (bbox[0] + (bbox[2] - bbox[0]) * (1 - relative_box[0])) + (bbox[2] - bbox[0]) * relative_box[2], 
                                                  (bbox[1] + (bbox[-1] - bbox[1]) * (1 - relative_box[1])) + (bbox[-1] - bbox[1]) * relative_box[-1])
    cropped_image = image.crop(crop_box)
    cropped_image = cropped_image.convert("L")

    draw = ImageDraw.Draw(image)
    draw.rectangle(crop_box, outline="black")
    image.save("selection_showcase.png")

    cropped_image = cropped_image.convert("L")
    cropped_image.save("ai_image_input.png")

    return cropped_image

def read_image_text(image: Image.Image, psm: int = 3, oem: int = 3, user_words: list[str] = None) -> str:
    """
    Feeds the image to tesseract, and returns the text it detected.
    """
    if user_words:
        with open("user_words.txt", "w") as f:
            f.write("\n".join(user_words))
        config = f"--oem {oem} --psm {psm} --user-words \"{os.path.join(os.path.dirname(os.path.abspath(__file__)), 'user_words.txt')}\""
    else:
        config = f"--oem {oem} --psm {psm}"

    try:
        return pytesseract.image_to_string(image, config=config)
    except pytesseract.TesseractNotFoundError as e:
        print(e)
        exit(1)