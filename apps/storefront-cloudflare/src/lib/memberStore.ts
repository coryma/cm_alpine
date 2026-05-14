const CHANGE_EVENT_NAME = "alpine-storefront-member-change";

export interface MemberDefaultAddress {
  recipient: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  district: string;
  postalCode: string;
}

export interface MemberProfile {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  joinedAt: string;
  defaultAddress: MemberDefaultAddress | null;
  isAdmin: boolean;
}

export interface RegisterMemberInput {
  fullName: string;
  email: string;
  phone: string;
  password: string;
}

export interface LoginMemberInput {
  email: string;
  password: string;
}

export interface ManagedMemberInput {
  fullName: string;
  email: string;
  phone: string;
  password: string;
}

let currentMember: MemberProfile | null = null;

function isBrowser() {
  return typeof window !== "undefined";
}

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function dispatchChange(member: MemberProfile | null) {
  currentMember = member;

  if (!isBrowser()) {
    return;
  }

  window.dispatchEvent(
    new CustomEvent(CHANGE_EVENT_NAME, {
      detail: member
    })
  );
}

export function loadCurrentMember() {
  return currentMember;
}

export async function refreshCurrentMember() {
  const payload = await requestMemberApi<{
    member?: MemberProfile | null;
    error?: string;
    message?: string;
  }>("/api/me", {
    method: "GET"
  });

  dispatchChange(payload.member ?? null);
  return payload.member ?? null;
}

export function subscribeMember(listener: (member: MemberProfile | null) => void) {
  if (!isBrowser()) {
    return () => {};
  }

  const handleChange = (event: Event) => {
    const customEvent = event as CustomEvent<MemberProfile | null>;
    listener(customEvent.detail ?? currentMember);
  };

  window.addEventListener(CHANGE_EVENT_NAME, handleChange);

  return () => {
    window.removeEventListener(CHANGE_EVENT_NAME, handleChange);
  };
}

export async function registerMember(input: RegisterMemberInput) {
  const payload = await requestMemberApi<{
    member?: MemberProfile | null;
    error?: string;
    message?: string;
  }>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify(input)
  });

  dispatchChange(payload.member ?? null);
  return payload.member ?? null;
}

export async function loginMember(input: LoginMemberInput) {
  const payload = await requestMemberApi<{
    member?: MemberProfile | null;
    error?: string;
    message?: string;
  }>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(input)
  });

  dispatchChange(payload.member ?? null);
  return payload.member ?? null;
}

export async function logoutMember() {
  await requestMemberApi<{
    error?: string;
    message?: string;
  }>("/api/auth/logout", {
    method: "POST"
  });
  dispatchChange(null);
}

export async function updateMemberProfile(
  memberId: string,
  updates: Partial<Pick<MemberProfile, "fullName" | "phone">> & {
    defaultAddress?: Partial<MemberDefaultAddress> | null;
  }
) {
  if (!memberId || currentMember?.id !== memberId) {
    return currentMember;
  }

  const payload = await requestMemberApi<{
    member?: MemberProfile | null;
    error?: string;
    message?: string;
  }>("/api/me", {
    method: "PATCH",
    body: JSON.stringify({
      fullName: normalizeText(updates.fullName),
      phone: normalizeText(updates.phone),
      defaultAddress: updates.defaultAddress ?? null
    })
  });

  dispatchChange(payload.member ?? null);
  return payload.member ?? null;
}

export async function listManagedMembers() {
  const payload = await requestMemberApi<{
    members?: MemberProfile[];
    error?: string;
    message?: string;
  }>("/api/admin/members", {
    method: "GET"
  });

  return payload.members || [];
}

export async function createManagedMember(input: ManagedMemberInput) {
  const payload = await requestMemberApi<{
    created?: boolean;
    member?: MemberProfile | null;
    error?: string;
    message?: string;
  }>("/api/admin/members", {
    method: "POST",
    body: JSON.stringify(input)
  });

  return {
    created: Boolean(payload.created),
    member: payload.member ?? null
  };
}

async function requestMemberApi<T extends { error?: string; message?: string }>(
  pathname: string,
  init: RequestInit
) {
  const response = await fetch(pathname, {
    ...init,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(init.headers || {})
    }
  });

  const payload = (await response.json()) as T;

  if (!response.ok) {
    throw new Error(payload.message || payload.error || "Member API request failed.");
  }

  return payload;
}
