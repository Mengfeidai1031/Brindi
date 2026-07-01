/** Frases para el quiz de grupo "¿Quién de aquí…?" (no factuales; fáciles de localizar). */

const ES: string[] = [
  '¿Quién de aquí es más probable que llegue tarde?',
  '¿Quién se reiría en el peor momento posible?',
  '¿Quién sobreviviría más tiempo en una isla desierta?',
  '¿Quién canta peor en el karaoke?',
  '¿Quién gastaría su último dinero en una tontería?',
  '¿Quién se quedaría dormido en el cine?',
  '¿Quién es más probable que se haga famoso?',
  '¿Quién olvidaría su propio cumpleaños?',
  '¿Quién ganaría un concurso de comer?',
  '¿Quién es el más dramático del grupo?',
  '¿Quién haría el viaje más loco sin avisar?',
  '¿Quién contesta mensajes a las 4 de la mañana?',
  '¿Quién se perdería con el GPS en la mano?',
  '¿Quién da los mejores consejos?',
  '¿Quién es el más competitivo en un juego de mesa?',
  '¿Quién adoptaría diez gatos?',
  '¿Quién acabará siendo el jefe de todos?',
  '¿Quién cuenta el mismo chiste dos veces?',
  '¿Quién bailaría encima de la mesa?',
  '¿Quién llora con los anuncios de la tele?',
  '¿Quién se apuntaría a cualquier plan de última hora?',
  '¿Quién tiene siempre el móvil sin batería?',
];

const EN: string[] = [
  'Who here is most likely to arrive late?',
  'Who would laugh at the worst possible moment?',
  'Who would survive longest on a desert island?',
  'Who is the worst at karaoke?',
  'Who would spend their last money on something silly?',
  'Who would fall asleep at the cinema?',
  'Who is most likely to become famous?',
  'Who would forget their own birthday?',
  'Who would win an eating contest?',
  'Who is the most dramatic in the group?',
  'Who would take the craziest trip without telling anyone?',
  'Who replies to messages at 4 in the morning?',
  'Who would get lost with the GPS in hand?',
  'Who gives the best advice?',
  'Who is the most competitive at a board game?',
  'Who would adopt ten cats?',
  'Who will end up being everyone’s boss?',
  'Who tells the same joke twice?',
  'Who would dance on the table?',
  'Who cries at TV commercials?',
  'Who would join any last-minute plan?',
  'Who always has a dead phone battery?',
];

export function groupQuizPrompts(locale: string): string[] {
  return locale === 'en' ? EN : ES;
}
