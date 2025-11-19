import { IAuthUser } from './iauth-user';

/**
 * Relation type definitions - represents the status between two users
 * Note: 'no_relation' is computed (no DB record exists), not stored in database
 */
export type RelationType = 'friend' | 'blocked' | 'pending_sent' | 'pending_received';

/**
 * Computed relation status that includes no_relation when no record exists
 */
export type ComputedRelationType = RelationType | 'no_relation';

/**
 * User relation record in PocketBase
 * Represents a directed relationship from `from_user` to `to_user`
 */
export interface IRelation {
  id: string;
  from_user: string; // User ID initiating the relation
  to_user: string; // User ID receiving the relation
  type: RelationType;
  created: string; // ISO timestamp
  updated: string; // ISO timestamp
  expand?: {
    from_user?: IAuthUser;
    to_user?: IAuthUser;
  };
  // PocketBase metadata
  collectionId?: string;
  collectionName?: string;
}

/**
 * Computed relation status between current user and another user
 * Takes into account both directions of the relation
 * 'no_relation' is computed when no record exists (not stored in DB)
 */
export interface IRelationStatus {
  type: ComputedRelationType;
  isInitiatedByMe: boolean; // True if current user initiated friend request
  relation?: IRelation; // The actual relation record (if exists)
}
