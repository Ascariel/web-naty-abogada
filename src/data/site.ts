export const site = {
  name: 'Natalia Vallejos',
  fullName: 'Natalia Vallejos Gutiérrez',
  role: 'Abogada — Derecho de Familia',
  city: 'Santiago, Chile',
  domain: 'nataliavallejos.cl',
  whatsappNumber: '56936387240',
  whatsappDefaultMessage:
    'Hola Natalia, me gustaría una orientación legal. ¿Podrías ayudarme?',
  email: 'contacto@nataliavallejos.cl',
  // TODO: replace with real address
  officeAddress: 'Oficina en Santiago Centro · Chile',
  // TODO: real social links
  instagram: '',
  linkedin: '',
  // Trust signals (placeholder until Naty confirms)
  university: 'Universidad de Chile',
  yearAdmitted: 2018,
  diplomado: 'Diplomado en Derecho de Familia, Infancia y Adolescencia',
  yearsExperience: 6,
} as const;

export const navItems = [
  { href: '/', label: 'Inicio' },
  { href: '/sobre-mi', label: 'Sobre mí' },
  { href: '/areas-de-practica', label: 'Áreas de práctica' },
  { href: '/contacto', label: 'Contacto' },
];

export function whatsappLink(message?: string): string {
  const text = encodeURIComponent(message ?? site.whatsappDefaultMessage);
  return `https://wa.me/${site.whatsappNumber}?text=${text}`;
}

const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');

export function path(p: string): string {
  if (!p.startsWith('/')) return p;
  return BASE + p;
}
