# Artist Guide: Character Layer System

## Overview

This system builds characters by stacking transparent PNG images in a specific order. Each layer can mix and match with others to create thousands of unique combinations.

## Canvas Requirements

- **Size**: 800x800 pixels
- **Format**: PNG with transparency
- **Background**: Transparent (no background color)
- **Style**: Consistent watercolor illustration with bold black outlines

## Layer Order (Bottom to Top)

```
Backgrounds     ← Drawn first (bottom layer)
1-base          ← Character body/skin
2-skin          ← Tattoos, makeup, scars
3-undergarments ← Bras, undershirts
4-clothing      ← Shirts, dresses, pants
5-outerwear     ← Jackets, coats, vests
6-hair          ← Hairstyles
7-face-accessories ← Glasses, eyepatches
8-headwear      ← Hats, helmets, crowns
9-misc-accessories ← Jewelry, cigarettes
Overlays        ← Effects like smoke, glows (top layer)
```

## File Naming Rules

### Gender-Specific Items

- `male-[item].png` - Only works on male characters
- `female-[item].png` - Only works on female characters

### Gender-Neutral Items

- `[item].png` - Works on both male and female characters

### Examples

```
✅ male-fedora.png        (male only)
✅ female-tiara.png       (female only)
✅ cowboy-hat.png         (works on both)
✅ sunglasses.png         (works on both)
```

## Drawing Guidelines

### Base Characters (Layer 1)

- Draw the nude character body with skin tone
- Keep pose consistent across all base characters
- Male and female should have same head position and angle

### Hair (Layer 6)

- Draw hair that works with different hats
- Consider how hair will look under helmets, beanies, etc.
- Some hairstyles may be incompatible with certain headwear

### Clothing Layers (3-5)

- **Undergarments**: Draw parts that might show under clothing
- **Clothing**: Main shirts, dresses - should work under jackets
- **Outerwear**: Jackets, coats - design to show clothing underneath

### Accessories (7-9)

- **Face accessories**: Glasses, masks, eyepatches
- **Headwear**: Hats, helmets - consider hair compatibility
- **Misc accessories**: Jewelry, held items, etc.

## Compatibility Rules

### Hair + Headwear

Some combinations don't work:

- Long hair + tight caps = ❌
- Mohawk + most hats = ❌
- Short hair + most hats = ✅

### Clothing + Outerwear

Design clothing to show appropriately under jackets:

- Shirt collars should peek out of jackets
- Dress hems should show under coats

## Adding New Assets

1. **Create the PNG file** following the naming rules
2. **Add to manifest.json**:
   ```json
   "6-hair": {
     "male": ["male-short.png", "male-mohawk.png"],
     "female": ["female-long.png", "female-ponytail.png"],
     "neutral": ["bald.png"]
   }
   ```
3. **Add compatibility rules** if needed:
   ```json
   {
     "file": "male-mohawk.png",
     "incompatible_headwear": ["beanie.png", "fedora.png"],
     "compatible_headwear": ["helmet.png"]
   }
   ```

## Tips for Artists

### ✅ Do:

- Keep the same art style across all layers
- Use consistent lighting direction
- Make sure transparent areas are fully transparent
- Test your assets in different combinations
- Draw items that make sense together

### ❌ Don't:

- Change the character's pose or head position
- Use different art styles between layers
- Include backgrounds in character layers
- Make items that would clip through each other
- Forget to update the manifest when adding files

## Testing Your Work

After adding new assets:

1. Update the manifest.json file
2. Generate some test characters
3. Check that your new items appear and look good
4. Verify compatibility with other layers

## Questions?

If something doesn't look right or you need a new compatibility rule added, just ask a developer to update the manifest.json file!
