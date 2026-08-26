import "server-only";

import { cache } from "react";
import {
  canAccessAdministration,
  getCurrentUser,
} from "@/lib/auth/current-user";
import type { MemberNetwork } from "@/lib/member-registration";
import { createClient } from "@/lib/supabase/server";

export type MemberRegistrationSummary = {
  id: string;
  fullName: string;
  birthDate: string;
  rg: string;
  addressStreet: string;
  addressNumber: string;
  neighborhood: string;
  city: string;
  postalCode: string;
  baptismDate: string;
  network: MemberNetwork;
  disciplerName: string;
  whatsapp: string;
  createdAt: string;
};

type RawMemberRegistration = {
  id: string;
  full_name: string;
  birth_date: string;
  rg: string;
  address_street: string;
  address_number: string;
  neighborhood: string;
  city: string;
  postal_code: string;
  baptism_date: string;
  network: MemberNetwork;
  discipler_name: string;
  whatsapp: string;
  created_at: string;
};

const memberRegistrationColumns =
  "id, full_name, birth_date, rg, address_street, address_number, neighborhood, city, postal_code, baptism_date, network, discipler_name, whatsapp, created_at";

function mapMemberRegistration(
  registration: RawMemberRegistration,
): MemberRegistrationSummary {
  return {
    id: registration.id,
    fullName: registration.full_name,
    birthDate: registration.birth_date,
    rg: registration.rg,
    addressStreet: registration.address_street,
    addressNumber: registration.address_number,
    neighborhood: registration.neighborhood,
    city: registration.city,
    postalCode: registration.postal_code,
    baptismDate: registration.baptism_date,
    network: registration.network,
    disciplerName: registration.discipler_name,
    whatsapp: registration.whatsapp,
    createdAt: registration.created_at,
  };
}

export const canAccessMemberRegistrations = cache(async () => {
  const user = await getCurrentUser();
  return user ? canAccessAdministration(user) : false;
});

export async function getMemberRegistrations() {
  if (!(await canAccessMemberRegistrations())) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("member_registrations")
    .select(memberRegistrationColumns)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(500);

  const registrations = ((data ?? []) as RawMemberRegistration[]).map(
    mapMemberRegistration,
  );

  return { registrations, hasError: Boolean(error) };
}

export async function getMemberRegistration(registrationId: string) {
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      registrationId,
    ) ||
    !(await canAccessMemberRegistrations())
  ) {
    return null;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("member_registrations")
    .select(memberRegistrationColumns)
    .eq("id", registrationId)
    .maybeSingle();

  if (error || !data) return null;
  return mapMemberRegistration(data as RawMemberRegistration);
}
