import * as React from "react"
import { HexColorPicker } from "react-colorful"
import { cn } from "@/lib/utils"

export type ColorPickerProps = React.ComponentProps<typeof HexColorPicker>

const ColorPicker = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("w-fit h-fit min-h-[200px] rounded-md border shadow-sm", className)}
    {...props}
  >
    {children}
  </div>
))
ColorPicker.displayName = "ColorPicker"

const ColorPickerHex = React.forwardRef<
  HTMLDivElement,
  Omit<React.ComponentProps<typeof HexColorPicker>, 'onChange'> &
  ColorPickerProps
>(({ className, style, ...props }, ref) => (
  <HexColorPicker
    className={cn(
      "aural-color-picker w-full rounded-none border-0 bg-transparent [&_.react-colorful__hue]:mt-3 [&_.react-colorful__hue]:h-6 [&_.react-colorful__hue]:rounded-full [&_.react-colorful__hue-pointer]:size-7 [&_.react-colorful__hue-pointer]:border-2 [&_.react-colorful__hue-pointer]:border-white [&_.react-colorful__hue-pointer]:bg-transparent [&_.react-colorful__hue-pointer]:shadow-none [&_.react-colorful__interactive]:rounded-[18px] [&_.react-colorful__pointer]:size-8 [&_.react-colorful__pointer]:border-[3px] [&_.react-colorful__pointer]:border-white [&_.react-colorful__pointer]:bg-transparent [&_.react-colorful__pointer]:shadow-none [&_.react-colorful__saturation]:rounded-[18px]",
      className
    )}
    style={{ width: "100%", height: 220, background: "transparent", ...style }}
    {...props}
  />
))
ColorPickerHex.displayName = "ColorPickerHex"

const ColorPickerInput = React.forwardRef<
  HTMLInputElement,
  React.ComponentProps<"input">
>(({ className, type, ...props }, ref) => (
  <input
    type={type}
    className={cn(
      "flex w-[200px] h-fit px-1 py-1 mt-0.5 bg-transparent transition-colors uppercase text-base md:text-sm file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
      className
    )}
    ref={ref}
    {...props}
  />
));
ColorPickerInput.displayName = "ColorPickerInput"

export { ColorPicker, ColorPickerHex, ColorPickerInput }
