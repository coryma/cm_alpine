import { useEffect, useState } from "react";
import type { ComponentPropsWithoutRef, SyntheticEvent } from "react";

const FALLBACK_IMAGE_SRC = "/images/product-placeholder-wellness.svg";

type StorefrontImageProps = ComponentPropsWithoutRef<"img">;

export function StorefrontImage({
  onError,
  src,
  ...props
}: StorefrontImageProps) {
  const normalizedSrc = src?.trim() ? src : FALLBACK_IMAGE_SRC;
  const [currentSrc, setCurrentSrc] = useState(normalizedSrc);

  useEffect(() => {
    setCurrentSrc(normalizedSrc);
  }, [normalizedSrc]);

  const handleError = (event: SyntheticEvent<HTMLImageElement, Event>) => {
    onError?.(event);

    if (currentSrc !== FALLBACK_IMAGE_SRC) {
      setCurrentSrc(FALLBACK_IMAGE_SRC);
    }
  };

  return <img {...props} onError={handleError} src={currentSrc} />;
}
