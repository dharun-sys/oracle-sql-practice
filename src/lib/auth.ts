import { supabase } from "@/lib/supabaseClient";
import bcrypt from "bcryptjs";

type UserRecord = {
  id: string;
  password: string | null;
  student_name?: string | null;
  register_no?: string | null;
  is_admin?: boolean | null;
};
export async function findUserByRegister(registerNumber: string): Promise<UserRecord | null> {
  const { data, error } = await supabase
    .from("users")
    .select("id,password,register_no,student_name,is_admin")
    .eq("register_no", registerNumber)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) return null;

  return {
    id: data.id,
    password: data.password,
    student_name: data.student_name,
    register_no: data.register_no,
    is_admin: (data as any).is_admin ?? (data as any).isAdmin ?? null,
  };
}

export async function findUserById(userId: string): Promise<UserRecord | null> {
  const { data, error } = await supabase
    .from('users')
    .select('id,password,register_no,student_name,is_admin')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    id: data.id,
    password: data.password,
    student_name: data.student_name,
    register_no: data.register_no,
    is_admin: (data as any).is_admin ?? (data as any).isAdmin ?? null,
  };
}

export async function createPasswordForRegister(registerNumber: string, plainPassword: string) {
  const saltRounds = 10;
  const hashed = await bcrypt.hash(plainPassword, saltRounds);

  const { data, error } = await supabase
    .from("users")
    .update({ password: hashed })
    .eq("register_no", registerNumber)
    .select("id")
    .maybeSingle();

  if (error) throw error;

  return data;
}

export async function verifyPasswordForRegister(registerNumber: string, plainPassword: string) {
  const user = await findUserByRegister(registerNumber);
  if (!user) return false;
  if (!user.password) return false;

  const match = await bcrypt.compare(plainPassword, user.password);
  return match;
}

export async function createSessionForRegister(registerNumber: string, ttlSeconds = 60 * 60 * 24 * 7) {
  // create a server-side session row tied to the user and return a token
  const user = await findUserByRegister(registerNumber);
  if (!user) throw new Error('user not found');

  const token = typeof crypto !== 'undefined' && (crypto as any).randomUUID ? (crypto as any).randomUUID() : Date.now().toString();
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();

  const payload = {
    user_id: user.id,
    token,
    expires_at: expiresAt,
  } as any;

  const { data, error } = await supabase.from('sessions').insert(payload).select().maybeSingle();
  if (error) throw error;
  return token;
}

export async function verifySessionToken(token: string) {
  if (!token) return null;
  const { data, error } = await supabase
    .from('sessions')
    .select('id, user_id, token, expires_at')
    .eq('token', token)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const now = new Date();
  if (data.expires_at && new Date(data.expires_at) < now) {
    // expired - optionally cleanup
    try { await supabase.from('sessions').delete().eq('id', data.id); } catch (e) { /* ignore */ }
    return null;
  }
  // return the user_id so caller can resolve user record
  return data.user_id as string;
}

export async function deleteSessionToken(token: string) {
  if (!token) return;
  await supabase.from('sessions').delete().eq('token', token);
}

export default {
  findUserByRegister,
  findUserById,
  createPasswordForRegister,
  verifyPasswordForRegister,
};
