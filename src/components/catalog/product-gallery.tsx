"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import type { ProductDetail } from "@/types/catalog";

type GalleryImage = ProductDetail["images"][number];

type ProductGalleryProps = {
  images: GalleryImage[];
  productName: string;
};

export function ProductGallery({ images, productName }: ProductGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);
  const selectedImage = images[selectedIndex];

  useEffect(() => {
    if (!isExpanded) {
      return;
    }

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsExpanded(false);
      }
    };

    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [isExpanded]);

  if (!selectedImage) {
    return (
      <div className="overflow-hidden rounded border border-zinc-200 bg-white">
        <div className="flex aspect-[4/3] items-center justify-center bg-[linear-gradient(135deg,#18181b_0%,#3f3f46_58%,#b91c1c_100%)] px-6 text-center text-sm font-black uppercase tracking-[0.16em] text-white">
          MustangMagic
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      <div className="overflow-hidden rounded border border-zinc-200 bg-white">
        <button
          type="button"
          onClick={() => setIsExpanded(true)}
          className="flex aspect-[4/3] w-full items-center justify-center bg-zinc-100 p-4"
        >
          <Image
            src={selectedImage.url}
            alt={selectedImage.altText ?? productName}
            width={selectedImage.width ?? 800}
            height={selectedImage.height ?? 800}
            sizes="(min-width: 1024px) 45vw, 100vw"
            className="max-h-full max-w-full object-contain"
            priority
          />
        </button>
      </div>

      {images.length > 1 ? (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {images.map((image, index) => (
            <button
              key={image.id}
              type="button"
              onClick={() => setSelectedIndex(index)}
              aria-label={`Show image ${index + 1} for ${productName}`}
              aria-pressed={index === selectedIndex}
              className="flex aspect-square items-center justify-center overflow-hidden rounded border border-zinc-200 bg-white p-2 transition hover:border-zinc-400 aria-pressed:border-red-700 aria-pressed:ring-2 aria-pressed:ring-red-700/20"
            >
              <Image
                src={image.url}
                alt={image.altText ?? productName}
                width={image.width ?? 800}
                height={image.height ?? 800}
                sizes="(min-width: 640px) 25vw, 33vw"
                className="max-h-full max-w-full object-contain"
              />
            </button>
          ))}
        </div>
      ) : null}

      {isExpanded ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${productName} image viewer`}
          className="fixed inset-0 z-50 grid bg-zinc-950/85 p-4"
        >
          <div className="mx-auto grid h-full w-full max-w-6xl grid-rows-[auto_1fr_auto] gap-4">
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setIsExpanded(false)}
                className="rounded bg-white px-4 py-2 text-sm font-black uppercase tracking-wide text-zinc-950 hover:bg-zinc-200"
              >
                Back to product
              </button>
            </div>
            <button
              type="button"
              onClick={() => setIsExpanded(false)}
              className="flex min-h-0 items-center justify-center rounded bg-white p-4"
              aria-label="Close image viewer"
            >
              <Image
                src={selectedImage.url}
                alt={selectedImage.altText ?? productName}
                width={selectedImage.width ?? 800}
                height={selectedImage.height ?? 800}
                sizes="100vw"
                className="max-h-full max-w-full object-contain"
              />
            </button>
            {images.length > 1 ? (
              <div className="flex justify-between gap-3">
                <button
                  type="button"
                  onClick={() =>
                    setSelectedIndex((current) =>
                      current === 0 ? images.length - 1 : current - 1,
                    )
                  }
                  className="rounded bg-white px-4 py-2 text-sm font-black uppercase tracking-wide text-zinc-950 hover:bg-zinc-200"
                >
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setSelectedIndex((current) =>
                      current === images.length - 1 ? 0 : current + 1,
                    )
                  }
                  className="rounded bg-white px-4 py-2 text-sm font-black uppercase tracking-wide text-zinc-950 hover:bg-zinc-200"
                >
                  Next
                </button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
