"use server"

import { desc, eq, sql } from "drizzle-orm"
import { db } from "./db"
import { locations, type LocationRow } from "./schema"

export async function getLocations(): Promise<LocationRow[]> {
  return db.select().from(locations).orderBy(desc(locations.upvotes))
}

export async function createLocation(data: {
  id: string
  name: string
  lat: number
  lng: number
  countryCode: string
}): Promise<void> {
  await db.insert(locations).values({ ...data, upvotes: 1 })
}

export async function changeUpvote(id: string, delta: 1 | -1): Promise<void> {
  await db
    .update(locations)
    .set({ upvotes: sql`max(0, ${locations.upvotes} + ${delta})` })
    .where(eq(locations.id, id))
}

export async function deleteLocation(id: string): Promise<void> {
  await db.delete(locations).where(eq(locations.id, id))
}
