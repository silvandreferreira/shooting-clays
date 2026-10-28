import { DISCIPLINE_KEYS, type DisciplineKey } from './disciplines';

/**
 * Where a series was shot: a club and one of its fields. The list lives here until clubs move to
 * the database in iteration 7, keeping these ids (decision #66). Field names come from the UI
 * strings (`Field 1`), club names are proper names.
 */
export interface ClubField {
  id: string;
  /** Disciplines shot on this field, in the order of DISCIPLINE_KEYS. */
  disciplines: readonly DisciplineKey[];
}

export interface Club {
  id: string;
  name: string;
  fields: readonly ClubField[];
}

export const CLUBS: readonly Club[] = [
  {
    id: 'ccm',
    name: 'CCM',
    fields: [
      { id: '1', disciplines: ['compak', 'fosso', 'helice'] },
      { id: '2', disciplines: ['compak', 'fosso'] },
      { id: '3', disciplines: ['compak'] },
      { id: '4', disciplines: ['compak'] },
    ],
  },
];

export const findClub = (clubId: string | null | undefined) => CLUBS.find((c) => c.id === clubId);

export const findField = (clubId: string | null | undefined, fieldId: string | null | undefined) =>
  findClub(clubId)?.fields.find((f) => f.id === fieldId);

/** The user's club: the home club they chose, or the first one. */
export const homeClub = (homeClubId: string | null | undefined): Club =>
  findClub(homeClubId) ?? CLUBS[0]!;

/**
 * The order of choice is club → discipline → field (decision #66): the disciplines shot at a
 * club (every one without a club), then the club's fields that have the chosen discipline.
 */
export function clubDisciplines(clubId: string | null | undefined): readonly DisciplineKey[] {
  const club = findClub(clubId);
  if (!club) return DISCIPLINE_KEYS;
  return DISCIPLINE_KEYS.filter((d) => club.fields.some((f) => f.disciplines.includes(d)));
}

export function disciplineFields(
  clubId: string | null | undefined,
  discipline: DisciplineKey,
): readonly ClubField[] {
  return findClub(clubId)?.fields.filter((f) => f.disciplines.includes(discipline)) ?? [];
}

export interface Place {
  clubId: string | null;
  fieldId: string | null;
  discipline: DisciplineKey;
}

/**
 * Why a club, field and discipline do not go together, or null when they do. No club and no
 * field is valid (series logged before clubs existed); a club without a field too.
 */
export function placeIssue(
  place: Place,
): { path: 'clubId' | 'fieldId' | 'discipline'; message: string } | null {
  if (place.clubId === null) {
    return place.fieldId === null ? null : { path: 'fieldId', message: 'fieldId needs a clubId' };
  }
  const club = findClub(place.clubId);
  if (!club)
    return {
      path: 'clubId',
      message: `clubId must be one of: ${CLUBS.map((c) => c.id).join(', ')}`,
    };
  if (place.fieldId === null) return null;
  const field = club.fields.find((f) => f.id === place.fieldId);
  if (!field) {
    return {
      path: 'fieldId',
      message: `fieldId must be one of: ${club.fields.map((f) => f.id).join(', ')}`,
    };
  }
  if (!field.disciplines.includes(place.discipline)) {
    return {
      path: 'discipline',
      message: `discipline must be one of the field's: ${field.disciplines.join(', ')}`,
    };
  }
  return null;
}
