export type ServiceGroup = 'pareja' | 'hijos' | 'proteccion' | 'otros';

export interface Service {
  slug: string;
  title: string;
  shortTitle?: string;
  group: ServiceGroup;
  icon: string; // name of a line-SVG icon in src/components/Icon.astro
  summary: string;
  description: string[];
  priceRange: string;
  pricingModel: string;
  includes?: string[];
  featured?: boolean;
}

export const groupLabels: Record<ServiceGroup, string> = {
  pareja: 'Pareja y matrimonio',
  hijos: 'Hijos y niñez (NNA)',
  proteccion: 'Protección',
  otros: 'Otros servicios',
};

export const services: Service[] = [
  // ─── Pareja y matrimonio ─────────────────────────────────────────
  {
    slug: 'divorcio-mutuo-acuerdo',
    title: 'Divorcio de mutuo acuerdo',
    shortTitle: 'Divorcio mutuo acuerdo',
    group: 'pareja',
    icon: 'scale',
    summary:
      'Ponemos término al matrimonio de manera rápida y sin conflicto, regulando alimentos, cuidado personal y bienes en un solo acuerdo.',
    description: [
      'El divorcio de mutuo acuerdo es la vía más rápida y económica para terminar un matrimonio en Chile. Requiere que ambas partes hayan estado separadas por al menos 1 año y que firmen un Acuerdo Completo y Suficiente que regule alimentos, cuidado personal, régimen de visitas y régimen de bienes.',
      'Te acompaño en la redacción del acuerdo, presento la demanda en el Tribunal de Familia correspondiente y comparezco contigo a la audiencia. En la mayoría de los casos, la sentencia se obtiene en 2 a 4 meses.',
    ],
    priceRange: 'Desde $400.000',
    pricingModel: 'Suma alzada · pago en cuotas disponible',
    includes: [
      'Redacción del Acuerdo Completo y Suficiente',
      'Presentación de la demanda',
      'Comparecencia a audiencia',
      'Sentencia ejecutoriada e inscripción en Registro Civil',
    ],
    featured: true,
  },
  {
    slug: 'divorcio-unilateral',
    title: 'Divorcio unilateral por cese de convivencia',
    shortTitle: 'Divorcio unilateral',
    group: 'pareja',
    icon: 'scale',
    summary:
      'Si tu cónyuge no quiere divorciarse, puedo demandar el divorcio unilateralmente acreditando 3 años de cese de convivencia.',
    description: [
      'El divorcio unilateral procede cuando una sola parte desea divorciarse y existe un cese efectivo de la convivencia por al menos 3 años. Es un juicio contencioso que requiere acreditar el cese mediante testigos, documentos o cese previamente notificado.',
      'Incluye opcionalmente la solicitud de compensación económica si correspondiere. Manejamos casos con o sin compensación, y con cónyuges que residen fuera de Chile.',
    ],
    priceRange: 'Desde $550.000',
    pricingModel: 'Suma alzada (con compensación: cuota litis 20% adicional)',
    featured: true,
  },
  {
    slug: 'divorcio-culposo',
    title: 'Divorcio culposo',
    group: 'pareja',
    icon: 'scale',
    summary:
      'Cuando hay violencia, abandono o conducta gravemente lesiva del matrimonio, el divorcio culposo se decreta sin esperar plazos.',
    description: [
      'El divorcio culposo procede cuando uno de los cónyuges incurre en una falta grave imputable: violencia intrafamiliar, abandono, infidelidad reiterada, atentados contra la integridad física o psíquica.',
      'No requiere acreditar tiempo de cese de convivencia. Es un juicio más complejo, donde se rinde prueba sobre los hechos. Suele combinarse con medidas de protección y solicitud de compensación económica.',
    ],
    priceRange: 'Desde $700.000',
    pricingModel: 'Suma alzada según complejidad',
  },
  {
    slug: 'cese-efectivo-convivencia',
    title: 'Cese efectivo de convivencia',
    group: 'pareja',
    icon: 'file-text',
    summary:
      'Notificación formal de cese de convivencia para empezar a contar los plazos del divorcio unilateral.',
    description: [
      'La notificación de cese efectivo de convivencia es una gestión preparatoria que da fecha cierta al término de la vida en común. Es indispensable cuando se pretende divorciarse unilateralmente más adelante, pues fija el inicio del plazo de 3 años.',
      'Se realiza ante notario o por gestión voluntaria en tribunales. Es una gestión rápida y económica.',
    ],
    priceRange: 'Desde $150.000',
    pricingModel: 'Suma alzada',
  },

  // ─── Hijos / NNA ────────────────────────────────────────────────
  {
    slug: 'pension-de-alimentos',
    title: 'Pensión de alimentos',
    group: 'hijos',
    icon: 'coins',
    summary:
      'Demanda inicial para fijar la pensión de alimentos a favor de tus hijos, calculada según los ingresos del demandado y las necesidades del niño.',
    description: [
      'Si el padre o madre no contribuye al sustento de los hijos, la ley te respalda. Demando la pensión de alimentos en el Tribunal de Familia, gestiono la mediación previa obligatoria y obtengo una pensión provisoria desde el día de presentada la demanda.',
      'La pensión se fija como porcentaje del ingreso del alimentante o como monto fijo en UTM. Incluye además la inscripción en el Registro Nacional de Deudores si hay incumplimiento.',
    ],
    priceRange: 'Desde $300.000',
    pricingModel: 'Suma alzada · pago en cuotas',
    includes: [
      'Mediación previa obligatoria',
      'Demanda en Tribunal de Familia',
      'Solicitud de pensión provisoria',
      'Comparecencia a audiencia preparatoria y de juicio',
    ],
    featured: true,
  },
  {
    slug: 'pension-modificacion',
    title: 'Aumento, rebaja o cese de pensión de alimentos',
    shortTitle: 'Modificación de pensión',
    group: 'hijos',
    icon: 'refresh',
    summary:
      'Si las circunstancias cambiaron, la pensión también puede modificarse: aumentarla, rebajarla o ponerle cese.',
    description: [
      'La pensión de alimentos no es inmutable. Si los ingresos del alimentante aumentaron significativamente, las necesidades del hijo crecieron, o el alimentante perdió su trabajo, procede solicitar la revisión.',
      'También puedo solicitar el cese cuando el hijo cumple los requisitos (mayoría de edad sin estudiar, autonomía económica, etc.).',
    ],
    priceRange: 'Desde $250.000',
    pricingModel: 'Suma alzada',
  },
  {
    slug: 'cuidado-personal',
    title: 'Custodia de niños (cuidado personal)',
    shortTitle: 'Custodia de niños',
    group: 'hijos',
    icon: 'users',
    summary:
      'Solicito o defiendo el cuidado personal de los hijos cuando hay separación, conflicto o cambio de circunstancias.',
    description: [
      'El cuidado personal —antes llamado tuición— es la atribución legal sobre con quién vive el niño. Por defecto, en separaciones, lo tiene quien estaba al cuidado al momento de la ruptura, pero puede demandarse para modificarlo cuando el bienestar del niño lo justifica.',
      'Trabajo casos contenciosos y declarativos, incluyendo evaluaciones psicosociales y participación de los niños en audiencia reservada con el juez.',
    ],
    priceRange: 'Desde $600.000',
    pricingModel: 'Suma alzada',
    featured: true,
  },
  {
    slug: 'regimen-visitas',
    title: 'Régimen de visitas (relación directa y regular)',
    shortTitle: 'Régimen de visitas',
    group: 'hijos',
    icon: 'calendar',
    summary:
      'Establezco, modifico o hago cumplir el régimen de visitas para asegurar que el padre o madre que no convive con el hijo mantenga el vínculo.',
    description: [
      'La relación directa y regular —comúnmente "régimen de visitas"— es un derecho del niño y un deber del padre o madre que no tiene el cuidado personal. Cuando no hay acuerdo, debe fijarse judicialmente.',
      'Incluye fines de semana alternados, vacaciones, fechas especiales y videollamadas si la distancia lo amerita. También gestiono la modificación del régimen vigente y su cumplimiento forzado cuando se obstaculiza.',
    ],
    priceRange: 'Desde $350.000',
    pricingModel: 'Suma alzada',
  },
  {
    slug: 'autorizacion-salida-pais',
    title: 'Autorización de salida del país',
    group: 'hijos',
    icon: 'plane',
    summary:
      'Cuando un padre se niega injustificadamente a autorizar la salida del país de un hijo menor de edad, la autorización puede pedirse en tribunales.',
    description: [
      'Si necesitas viajar con tu hijo al extranjero y el otro padre no autoriza el permiso notarial requerido (o no es ubicable), puedo solicitar la autorización judicial en el Tribunal de Familia.',
      'Aplicable también para residencia permanente en el extranjero, viajes de estudios o emergencias médicas. El plazo de tramitación depende del tribunal, en general entre 1 y 3 meses.',
    ],
    priceRange: 'Desde $250.000',
    pricingModel: 'Suma alzada',
  },
  {
    slug: 'reconocimiento-paternidad',
    title: 'Reconocimiento de paternidad',
    group: 'hijos',
    icon: 'user-check',
    summary:
      'Acción de reclamación de filiación para que el padre biológico sea reconocido legalmente, con derechos hereditarios y obligación alimentaria.',
    description: [
      'Cuando un padre no quiere reconocer voluntariamente a su hijo, la ley permite demandar la paternidad. La prueba reina es el examen de ADN, que el tribunal puede ordenar y cuya negativa injustificada constituye presunción grave.',
      'Una vez reconocida la paternidad, el hijo tiene derecho a alimentos, herencia y al apellido paterno. Trabajo también casos de impugnación o nulidad de paternidad cuando corresponda.',
    ],
    priceRange: 'Desde $400.000',
    pricingModel: 'Suma alzada',
  },

  // ─── Protección ─────────────────────────────────────────────────
  {
    slug: 'violencia-intrafamiliar',
    title: 'Violencia intrafamiliar (VIF)',
    group: 'proteccion',
    icon: 'shield',
    summary:
      'Asesoría y representación inmediata en casos de violencia intrafamiliar, con medidas cautelares y de protección.',
    description: [
      'En casos de violencia intrafamiliar el tiempo es crítico. Solicito medidas cautelares de protección (prohibición de acercamiento, salida del agresor del hogar común, abandono inmediato), denuncio ante el Ministerio Público cuando configura delito, y represento a la víctima durante todo el proceso.',
      'La primera orientación en casos de VIF es siempre gratuita. Mi compromiso es darte una respuesta clara dentro de las 24 horas siguientes a tu consulta.',
    ],
    priceRange: 'Primera orientación gratuita · representación desde $250.000',
    pricingModel: 'Suma alzada (representación) · pago en cuotas',
    featured: true,
  },
  {
    slug: 'medidas-de-proteccion',
    title: 'Medidas de protección por negligencia parental',
    shortTitle: 'Medidas de protección',
    group: 'proteccion',
    icon: 'shield-alert',
    summary:
      'Solicito medidas de protección ante el Tribunal de Familia cuando un niño, niña o adolescente está siendo vulnerado en sus derechos.',
    description: [
      'Las medidas de protección proceden cuando un NNA es víctima de negligencia parental, abandono, maltrato o cualquier forma de vulneración de sus derechos. Pueden solicitarse por familiares, vecinos, profesores o cualquier persona que tome conocimiento.',
      'El tribunal puede ordenar tratamientos psicológicos, traslado de cuidado a otro adulto responsable, ingreso a residencias o programas, y supervisión continua del caso.',
    ],
    priceRange: 'Desde $300.000',
    pricingModel: 'Suma alzada',
  },

  // ─── Otros servicios ────────────────────────────────────────────
  {
    slug: 'isapre-topes-salud-mental',
    title:
      'Eliminación de topes anuales en prestaciones psicológicas — Isapre',
    shortTitle: 'Recurso contra Isapre · salud mental',
    group: 'otros',
    icon: 'heart-pulse',
    summary:
      'Recurso de protección al amparo de la Ley 21.331 para eliminar los topes anuales que imponen las Isapres a las prestaciones psicológicas y psiquiátricas.',
    description: [
      'La Ley 21.331 reconoce el derecho a la salud mental en igualdad con la salud física. Sin embargo, las Isapres siguen imponiendo topes anuales a las prestaciones psicológicas y psiquiátricas, lo que es contrario al espíritu de la ley.',
      'A través de un recurso de protección ante la Corte de Apelaciones, podemos obtener la eliminación de esos topes y la cobertura íntegra de tu tratamiento. El plazo es breve (3 a 6 meses) y la tasa de éxito en cortes es muy alta.',
    ],
    priceRange: 'Desde $80.000 pago único · o cuota litis 15% del beneficio',
    pricingModel: 'Mixto · sin costo inicial disponible',
    featured: true,
  },
  {
    slug: 'inscripcion-marca-inapi',
    title: 'Inscripción de marca comercial en INAPI',
    shortTitle: 'Registro de marca · INAPI',
    group: 'otros',
    icon: 'badge-check',
    summary:
      'Te ayudo a registrar tu marca, logo o eslogan en el Instituto Nacional de Propiedad Industrial para protegerlo legalmente por 10 años.',
    description: [
      'El registro de marca te otorga el derecho exclusivo de usar tu nombre comercial, logo o eslogan en Chile por 10 años renovables. Sin él, cualquiera puede registrar tu marca antes que tú.',
      'El proceso incluye el estudio de factibilidad (que la marca esté disponible), la solicitud ante INAPI, la publicación en el Diario Oficial, la respuesta a oposiciones si las hubiere, y la obtención del título de registro.',
    ],
    priceRange:
      'Honorarios desde $100.000 + tasas INAPI ~$220.000 (3 UTM por clase)',
    pricingModel: 'Suma alzada por etapas · 1ra cuota al ingreso, 2da al registro',
    includes: [
      'Estudio de factibilidad de marca',
      'Solicitud y seguimiento ante INAPI',
      'Publicación en Diario Oficial',
      'Defensa frente a oposiciones',
      'Entrega del título de registro',
    ],
  },
];

export function getFeaturedServices(): Service[] {
  return services.filter((s) => s.featured);
}

export function getServicesByGroup(group: ServiceGroup): Service[] {
  return services.filter((s) => s.group === group);
}
