import { clsx } from "clsx";
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

/**
 * Converts a string to Title Case, respecting Turkish characters.
 * @param {string} str 
 * @returns {string}
 */
export function toTitleCase(str) {
  if (!str) return ''
  return str
    .split(' ')
    .map(word => {
      if (!word) return ''
      return word.charAt(0).toLocaleUpperCase('tr-TR') + word.slice(1).toLocaleLowerCase('tr-TR')
    })
    .join(' ')
}
