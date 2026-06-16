export const site = {
  name: 'Natalia Vallejos',
  fullName: 'Natalia Vallejos Gutiérrez',
  role: 'Abogada — Derecho de Familia',
  city: 'Santiago, Chile',
  domain: 'nataliavallejos.cl',
  whatsappNumber: '56936387240',
  whatsappDefaultMessage:
    'Hola Natalia, me gustaría una orientación legal. ¿Podrías ayudarme?',
  email: 'nataliaandreavallejos@gmail.com',
  // TODO: replace with real address
  officeAddress: 'Atención en Santiago · Chile',
  instagram: '',
  linkedin: 'https://www.linkedin.com/in/natalia-vallejos-gutierrez/',
  university: 'Universidad Alberto Hurtado',
  degree: 'Licenciada en Ciencias Jurídicas y Sociales',
  yearAdmitted: 2026,
  diplomado: 'Diplomado en Gobierno Corporativo y Compliance, Universidad de Chile',
  practiceFocus: 'Derecho de Familia, Violencia Intrafamiliar y Derechos Humanos',
} as const;

export const navItems = [
  { href: '/', label: 'Inicio' },
  { href: '/sobre-mi', label: 'Sobre mí' },
  { href: '/servicios', label: 'Servicios y honorarios' },
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
