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
  return str.replace(/([^\W_]+[^\s-]*) */g, function (txt) {
    return txt.charAt(0).toLocaleUpperCase('tr-TR') + txt.substr(1).toLocaleLowerCase('tr-TR');
  });
}
