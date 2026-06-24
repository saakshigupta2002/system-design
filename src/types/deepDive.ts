/** Shared shapes for Advanced-mode deep-dive work (estimation, API design,
 *  data model, consistency). Kept provider-neutral so both the store and the
 *  scoring module can import them without coupling. */

/** The user's back-of-envelope assumptions (the capacity calculator's inputs). */
export interface EstimationInputs {
  dau: number;
  reqPerUser: number;
  writeRatio: number;
  dataSizeKB: number;
}

export interface UserApi {
  method: string; // GET | POST | PUT | PATCH | DELETE
  path: string;
}

export type EntityStoreType = "sql" | "nosql" | "cache" | "search" | "";

export interface UserEntity {
  name: string;
  type: EntityStoreType;
  partitionKey: string;
}

export type Consistency = "strong" | "eventual" | "mixed" | "";

/** All of a user's deep-dive work for one problem, persisted per problem. */
export interface DeepDiveEntry {
  estimation?: EstimationInputs;
  apis?: UserApi[];
  entities?: UserEntity[];
  consistency?: Consistency;
  consistencyNote?: string;
}
