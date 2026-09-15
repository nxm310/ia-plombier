/**
 * Utilitaire de formatage automatique des numéros de téléphone au format WhatsApp international.
 * 
 * Exemples :
 * - "0323456776" -> "+33 3 23 45 67 76"
 * - "0612345678" -> "+33 6 12 34 56 78"
 * - "07 12 34 56 78" -> "+33 7 12 34 56 78"
 * - "+33612345678" -> "+33 6 12 34 56 78"
 * - "33323456776" -> "+33 3 23 45 67 76"
 */
export function formatWhatsAppPhone(raw: string): string {
  if (!raw) return '';

  const trimmed = raw.trim();
  if (!trimmed) return '';

  // 1. Nettoyer les séparateurs usuels (. - / espaces)
  let clean = trimmed.replace(/[\s.\-_/()]/g, '');

  // 2. Remplacer le préfixe 0033 par +33
  if (clean.startsWith('0033')) {
    clean = '+33' + clean.slice(4);
  } else if (clean.startsWith('33') && !clean.startsWith('+33')) {
    clean = '+33' + clean.slice(2);
  }

  // 3. Format national français à 10 chiffres (commençant par 01 à 09)
  const digitsOnly = clean.replace(/\D/g, '');
  if (digitsOnly.length === 10 && digitsOnly.startsWith('0')) {
    const indicator = digitsOnly[1]; // 1, 2, 3, 4, 5, 6, 7, 8, 9
    const p1 = digitsOnly.slice(2, 4);
    const p2 = digitsOnly.slice(4, 6);
    const p3 = digitsOnly.slice(6, 8);
    const p4 = digitsOnly.slice(8, 10);
    return `+33 ${indicator} ${p1} ${p2} ${p3} ${p4}`;
  }

  // 4. Format international français à 11 chiffres (33 + 9 chiffres)
  if (digitsOnly.length === 11 && digitsOnly.startsWith('33')) {
    const indicator = digitsOnly[2];
    const p1 = digitsOnly.slice(3, 5);
    const p2 = digitsOnly.slice(5, 7);
    const p3 = digitsOnly.slice(7, 9);
    const p4 = digitsOnly.slice(9, 11);
    return `+33 ${indicator} ${p1} ${p2} ${p3} ${p4}`;
  }

  // 5. Déjà préfixé par +33
  if (clean.startsWith('+33')) {
    const sub = clean.slice(3).replace(/\D/g, '');
    if (sub.length === 9) {
      return `+33 ${sub[0]} ${sub.slice(1, 3)} ${sub.slice(3, 5)} ${sub.slice(5, 7)} ${sub.slice(7, 9)}`;
    }
  }

  // 6. Autre format international commençant par +
  if (clean.startsWith('+')) {
    return clean;
  }

  return clean;
}

/**
 * Normalise pour la saisie en direct (auto-formatage dès que 10 chiffres sont atteints)
 */
export function handlePhoneInputChange(value: string): string {
  const digits = value.replace(/\D/g, '');
  // Dès qu'on atteint 10 chiffres commençant par 0, ou 11 chiffres commençant par 33, formater immédiatement
  if ((digits.length === 10 && digits.startsWith('0')) || (digits.length === 11 && digits.startsWith('33'))) {
    return formatWhatsAppPhone(value);
  }
  return value;
}

export const autoFormatPhone = handlePhoneInputChange;
