export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      chapters: {
        Row: {
          chapter_number: number
          created_at: string | null
          description: string | null
          id: string
          story_id: string | null
          title: string
        }
        Insert: {
          chapter_number: number
          created_at?: string | null
          description?: string | null
          id?: string
          story_id?: string | null
          title: string
        }
        Update: {
          chapter_number?: number
          created_at?: string | null
          description?: string | null
          id?: string
          story_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "chapters_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
        ]
      }
      character_images: {
        Row: {
          character_id: string
          created_at: string
          description: string | null
          id: string
          image_url: string
          version: number
        }
        Insert: {
          character_id: string
          created_at?: string
          description?: string | null
          id: string
          image_url: string
          version: number
        }
        Update: {
          character_id?: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "character_images_characterId_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
        ]
      }
      character_inventory: {
        Row: {
          character_id: string
          created_at: string
          equipped_slot: string | null
          id: string
          is_equipped: boolean
          is_primary: boolean | null
          item_id: string
          quantity: number
          slot_index: number | null
          updated_at: string
        }
        Insert: {
          character_id: string
          created_at?: string
          equipped_slot?: string | null
          id: string
          is_equipped?: boolean
          is_primary?: boolean | null
          item_id: string
          quantity?: number
          slot_index?: number | null
          updated_at: string
        }
        Update: {
          character_id?: string
          created_at?: string
          equipped_slot?: string | null
          id?: string
          is_equipped?: boolean
          is_primary?: boolean | null
          item_id?: string
          quantity?: number
          slot_index?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "character_inventory_characterId_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "character_inventory_itemId_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "character_equipped_items"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "character_inventory_itemId_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
        ]
      }
      characters: {
        Row: {
          base_gender: string | null
          base_layer_file: string | null
          birth_image_url: string | null
          character_type: Database["public"]["Enums"]["CharacterType"]
          created_at: string
          current_image_url: string | null
          current_location_id: string
          current_version: number
          earth: number
          energy: number
          experience: number | null
          gender: Database["public"]["Enums"]["Gender"]
          health: number
          id: string
          level: number
          name: string
          nft_address: string | null
          payment_signature: string | null
          status: string | null
          token_id: string | null
          updated_at: string
          wallet_address: string
        }
        Insert: {
          base_gender?: string | null
          base_layer_file?: string | null
          birth_image_url?: string | null
          character_type?: Database["public"]["Enums"]["CharacterType"]
          created_at?: string
          current_image_url?: string | null
          current_location_id: string
          current_version?: number
          earth?: number
          energy?: number
          experience?: number | null
          gender: Database["public"]["Enums"]["Gender"]
          health?: number
          id: string
          level?: number
          name: string
          nft_address?: string | null
          payment_signature?: string | null
          status?: string | null
          token_id?: string | null
          updated_at: string
          wallet_address: string
        }
        Update: {
          base_gender?: string | null
          base_layer_file?: string | null
          birth_image_url?: string | null
          character_type?: Database["public"]["Enums"]["CharacterType"]
          created_at?: string
          current_image_url?: string | null
          current_location_id?: string
          current_version?: number
          earth?: number
          energy?: number
          experience?: number | null
          gender?: Database["public"]["Enums"]["Gender"]
          health?: number
          id?: string
          level?: number
          name?: string
          nft_address?: string | null
          payment_signature?: string | null
          status?: string | null
          token_id?: string | null
          updated_at?: string
          wallet_address?: string
        }
        Relationships: [
          {
            foreignKeyName: "characters_currentLocationId_fkey"
            columns: ["current_location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          character_id: string
          created_at: string
          id: string
          is_system: boolean
          location_id: string
          message: string
          message_type: Database["public"]["Enums"]["ChatMessageType"]
        }
        Insert: {
          character_id: string
          created_at?: string
          id: string
          is_system?: boolean
          location_id: string
          message: string
          message_type?: Database["public"]["Enums"]["ChatMessageType"]
        }
        Update: {
          character_id?: string
          created_at?: string
          id?: string
          is_system?: boolean
          location_id?: string
          message?: string
          message_type?: Database["public"]["Enums"]["ChatMessageType"]
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_characterId_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_locationId_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      choices: {
        Row: {
          choice_key: string
          created_at: string | null
          event_id: string | null
          id: string
          order_index: number
          text: string
        }
        Insert: {
          choice_key: string
          created_at?: string | null
          event_id?: string | null
          id?: string
          order_index: number
          text: string
        }
        Update: {
          choice_key?: string
          created_at?: string | null
          event_id?: string | null
          id?: string
          order_index?: number
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "choices_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      consequences: {
        Row: {
          choice_id: string | null
          consequence_data: Json
          created_at: string | null
          id: string
        }
        Insert: {
          choice_id?: string | null
          consequence_data: Json
          created_at?: string | null
          id?: string
        }
        Update: {
          choice_id?: string | null
          consequence_data?: Json
          created_at?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "consequences_choice_id_fkey"
            columns: ["choice_id"]
            isOneToOne: false
            referencedRelation: "choices"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment_slots: {
        Row: {
          category: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          layer_type: string | null
          max_slots_base: number | null
          max_slots_per_level: number | null
          max_slots_total: number | null
          name: string
          sort_order: number | null
          unlock_level: number | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          id: string
          is_active?: boolean | null
          layer_type?: string | null
          max_slots_base?: number | null
          max_slots_per_level?: number | null
          max_slots_total?: number | null
          name: string
          sort_order?: number | null
          unlock_level?: number | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          layer_type?: string | null
          max_slots_base?: number | null
          max_slots_per_level?: number | null
          max_slots_total?: number | null
          name?: string
          sort_order?: number | null
          unlock_level?: number | null
        }
        Relationships: []
      }
      events: {
        Row: {
          chapter_id: string | null
          created_at: string | null
          description: string
          id: string
          order_index: number
          title: string
        }
        Insert: {
          chapter_id?: string | null
          created_at?: string | null
          description: string
          id?: string
          order_index: number
          title: string
        }
        Update: {
          chapter_id?: string | null
          created_at?: string | null
          description?: string
          id?: string
          order_index?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
        ]
      }
      experience_logs: {
        Row: {
          character_id: string | null
          created_at: string | null
          details: Json | null
          experience_gained: number
          experience_total: number
          id: string
          level_after: number | null
          level_before: number | null
          leveled_up: boolean | null
          source: string
        }
        Insert: {
          character_id?: string | null
          created_at?: string | null
          details?: Json | null
          experience_gained: number
          experience_total: number
          id?: string
          level_after?: number | null
          level_before?: number | null
          leveled_up?: boolean | null
          source: string
        }
        Update: {
          character_id?: string | null
          created_at?: string | null
          details?: Json | null
          experience_gained?: number
          experience_total?: number
          id?: string
          level_after?: number | null
          level_before?: number | null
          leveled_up?: boolean | null
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "experience_logs_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
        ]
      }
      items: {
        Row: {
          base_layer_file: string | null
          category: Database["public"]["Enums"]["ItemCategory"]
          compatibility_rules: Json | null
          created_at: string
          description: string
          durability: number | null
          energy_effect: number | null
          has_gender_variants: boolean | null
          health_effect: number | null
          id: string
          image_url: string | null
          is_visual: boolean | null
          layer_file: string | null
          layer_gender: string | null
          layer_order: number | null
          layer_type: Database["public"]["Enums"]["LayerType"] | null
          name: string
          rarity: Database["public"]["Enums"]["Rarity"]
          updated_at: string
        }
        Insert: {
          base_layer_file?: string | null
          category: Database["public"]["Enums"]["ItemCategory"]
          compatibility_rules?: Json | null
          created_at?: string
          description: string
          durability?: number | null
          energy_effect?: number | null
          has_gender_variants?: boolean | null
          health_effect?: number | null
          id: string
          image_url?: string | null
          is_visual?: boolean | null
          layer_file?: string | null
          layer_gender?: string | null
          layer_order?: number | null
          layer_type?: Database["public"]["Enums"]["LayerType"] | null
          name: string
          rarity?: Database["public"]["Enums"]["Rarity"]
          updated_at: string
        }
        Update: {
          base_layer_file?: string | null
          category?: Database["public"]["Enums"]["ItemCategory"]
          compatibility_rules?: Json | null
          created_at?: string
          description?: string
          durability?: number | null
          energy_effect?: number | null
          has_gender_variants?: boolean | null
          health_effect?: number | null
          id?: string
          image_url?: string | null
          is_visual?: boolean | null
          layer_file?: string | null
          layer_gender?: string | null
          layer_order?: number | null
          layer_type?: Database["public"]["Enums"]["LayerType"] | null
          name?: string
          rarity?: Database["public"]["Enums"]["Rarity"]
          updated_at?: string
        }
        Relationships: []
      }
      location_resources: {
        Row: {
          difficulty: number
          id: string
          item_id: string
          location_id: string
          max_per_day: number | null
          spawn_rate: number
        }
        Insert: {
          difficulty?: number
          id: string
          item_id: string
          location_id: string
          max_per_day?: number | null
          spawn_rate?: number
        }
        Update: {
          difficulty?: number
          id?: string
          item_id?: string
          location_id?: string
          max_per_day?: number | null
          spawn_rate?: number
        }
        Relationships: [
          {
            foreignKeyName: "location_resources_itemId_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "character_equipped_items"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "location_resources_itemId_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "location_resources_locationId_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      locations: {
        Row: {
          biome: string | null
          chat_scope: Database["public"]["Enums"]["ChatScope"]
          created_at: string
          description: string
          difficulty: number
          entry_cost: number | null
          has_chat: boolean
          has_exchange: boolean
          has_market: boolean
          has_mining: boolean
          has_travel: boolean
          id: string
          image_url: string | null
          is_explored: boolean | null
          is_private: boolean
          last_active: string | null
          location_type: Database["public"]["Enums"]["LocationType"]
          lore: string | null
          map_x: number | null
          map_y: number | null
          min_level: number | null
          name: string
          parent_location_id: string | null
          player_count: number
          status: string | null
          svg_path_id: string | null
          territory: string | null
          theme: string | null
          updated_at: string
          welcome_message: string | null
        }
        Insert: {
          biome?: string | null
          chat_scope?: Database["public"]["Enums"]["ChatScope"]
          created_at?: string
          description: string
          difficulty?: number
          entry_cost?: number | null
          has_chat?: boolean
          has_exchange?: boolean
          has_market?: boolean
          has_mining?: boolean
          has_travel?: boolean
          id: string
          image_url?: string | null
          is_explored?: boolean | null
          is_private?: boolean
          last_active?: string | null
          location_type?: Database["public"]["Enums"]["LocationType"]
          lore?: string | null
          map_x?: number | null
          map_y?: number | null
          min_level?: number | null
          name: string
          parent_location_id?: string | null
          player_count?: number
          status?: string | null
          svg_path_id?: string | null
          territory?: string | null
          theme?: string | null
          updated_at: string
          welcome_message?: string | null
        }
        Update: {
          biome?: string | null
          chat_scope?: Database["public"]["Enums"]["ChatScope"]
          created_at?: string
          description?: string
          difficulty?: number
          entry_cost?: number | null
          has_chat?: boolean
          has_exchange?: boolean
          has_market?: boolean
          has_mining?: boolean
          has_travel?: boolean
          id?: string
          image_url?: string | null
          is_explored?: boolean | null
          is_private?: boolean
          last_active?: string | null
          location_type?: Database["public"]["Enums"]["LocationType"]
          lore?: string | null
          map_x?: number | null
          map_y?: number | null
          min_level?: number | null
          name?: string
          parent_location_id?: string | null
          player_count?: number
          status?: string | null
          svg_path_id?: string | null
          territory?: string | null
          theme?: string | null
          updated_at?: string
          welcome_message?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "locations_parentLocationId_fkey"
            columns: ["parent_location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      market_listings: {
        Row: {
          created_at: string
          id: string
          is_system_item: boolean
          item_id: string
          location_id: string
          price: number
          quantity: number
          seller_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id: string
          is_system_item?: boolean
          item_id: string
          location_id: string
          price: number
          quantity?: number
          seller_id?: string | null
          updated_at: string
        }
        Update: {
          created_at?: string
          id?: string
          is_system_item?: boolean
          item_id?: string
          location_id?: string
          price?: number
          quantity?: number
          seller_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "market_listings_itemId_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "character_equipped_items"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "market_listings_itemId_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "market_listings_locationId_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "market_listings_sellerId_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
        ]
      }
      npc_wallets: {
        Row: {
          character_id: string
          created_at: string | null
          encrypted_private_key: string
          public_key: string
        }
        Insert: {
          character_id: string
          created_at?: string | null
          encrypted_private_key: string
          public_key: string
        }
        Update: {
          character_id?: string
          created_at?: string | null
          encrypted_private_key?: string
          public_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "npc_wallets_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: true
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
        ]
      }
      pending_payments: {
        Row: {
          amount: number
          amount_received: number | null
          character_data: Json | null
          character_id: string | null
          created_at: string | null
          expires_at: string
          id: string
          memo: string | null
          minted_at: string | null
          nft_address: string | null
          nft_minted: boolean | null
          status: string
          transaction_signature: string | null
          treasury_wallet: string
          verified_at: string | null
          wallet_address: string
        }
        Insert: {
          amount: number
          amount_received?: number | null
          character_data?: Json | null
          character_id?: string | null
          created_at?: string | null
          expires_at: string
          id: string
          memo?: string | null
          minted_at?: string | null
          nft_address?: string | null
          nft_minted?: boolean | null
          status?: string
          transaction_signature?: string | null
          treasury_wallet: string
          verified_at?: string | null
          wallet_address: string
        }
        Update: {
          amount?: number
          amount_received?: number | null
          character_data?: Json | null
          character_id?: string | null
          created_at?: string | null
          expires_at?: string
          id?: string
          memo?: string | null
          minted_at?: string | null
          nft_address?: string | null
          nft_minted?: boolean | null
          status?: string
          transaction_signature?: string | null
          treasury_wallet?: string
          verified_at?: string | null
          wallet_address?: string
        }
        Relationships: [
          {
            foreignKeyName: "pending_payments_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
        ]
      }
      reservations: {
        Row: {
          amount_sol: number
          created_at: string
          id: string
          status: string
          transaction_signature: string
          updated_at: string
          wallet_address: string
        }
        Insert: {
          amount_sol: number
          created_at?: string
          id?: string
          status: string
          transaction_signature: string
          updated_at?: string
          wallet_address: string
        }
        Update: {
          amount_sol?: number
          created_at?: string
          id?: string
          status?: string
          transaction_signature?: string
          updated_at?: string
          wallet_address?: string
        }
        Relationships: []
      }
      stories: {
        Row: {
          character_path: string
          created_at: string | null
          description: string | null
          id: string
          title: string
          updated_at: string | null
        }
        Insert: {
          character_path: string
          created_at?: string | null
          description?: string | null
          id?: string
          title: string
          updated_at?: string | null
        }
        Update: {
          character_path?: string
          created_at?: string | null
          description?: string | null
          id?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      story_flags: {
        Row: {
          acquired_at: string | null
          chapter_acquired: number | null
          character_id: string
          created_at: string | null
          expires_at: string | null
          flag_name: string
          flag_value: Json | null
          id: string
          is_active: boolean | null
          metadata: Json | null
          story_id: string | null
          updated_at: string | null
        }
        Insert: {
          acquired_at?: string | null
          chapter_acquired?: number | null
          character_id: string
          created_at?: string | null
          expires_at?: string | null
          flag_name: string
          flag_value?: Json | null
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          story_id?: string | null
          updated_at?: string | null
        }
        Update: {
          acquired_at?: string | null
          chapter_acquired?: number | null
          character_id?: string
          created_at?: string | null
          expires_at?: string | null
          flag_name?: string
          flag_value?: Json | null
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          story_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "story_flags_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          character_id: string
          created_at: string
          description: string
          energy_burn: number | null
          exchange_flux: number | null
          from_units: number | null
          from_vault: string | null
          id: string
          item_id: string | null
          on_chain_signature: string | null
          quantity: number | null
          receiver_earth: string | null
          sender_earth: string | null
          sequence_id: number | null
          to_units: number | null
          to_vault: string | null
          txn_earth: string | null
          type: Database["public"]["Enums"]["TransactionType"]
          wasteland_block: number | null
        }
        Insert: {
          character_id: string
          created_at?: string
          description: string
          energy_burn?: number | null
          exchange_flux?: number | null
          from_units?: number | null
          from_vault?: string | null
          id: string
          item_id?: string | null
          on_chain_signature?: string | null
          quantity?: number | null
          receiver_earth?: string | null
          sender_earth?: string | null
          sequence_id?: number | null
          to_units?: number | null
          to_vault?: string | null
          txn_earth?: string | null
          type: Database["public"]["Enums"]["TransactionType"]
          wasteland_block?: number | null
        }
        Update: {
          character_id?: string
          created_at?: string
          description?: string
          energy_burn?: number | null
          exchange_flux?: number | null
          from_units?: number | null
          from_vault?: string | null
          id?: string
          item_id?: string | null
          on_chain_signature?: string | null
          quantity?: number | null
          receiver_earth?: string | null
          sender_earth?: string | null
          sequence_id?: number | null
          to_units?: number | null
          to_vault?: string | null
          txn_earth?: string | null
          type?: Database["public"]["Enums"]["TransactionType"]
          wasteland_block?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_characterId_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      character_equipped_items: {
        Row: {
          category: Database["public"]["Enums"]["ItemCategory"] | null
          character_id: string | null
          equipped_slot: string | null
          inventory_id: string | null
          is_equipped: boolean | null
          is_primary: boolean | null
          item_id: string | null
          item_name: string | null
          layer_file: string | null
          layer_gender: string | null
          layer_order: number | null
          layer_type: Database["public"]["Enums"]["LayerType"] | null
          rarity: Database["public"]["Enums"]["Rarity"] | null
          slot_index: number | null
          slot_name: string | null
          slot_sort_order: number | null
        }
        Relationships: [
          {
            foreignKeyName: "character_inventory_characterId_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
        ]
      }
      reservation_stats: {
        Row: {
          avg_reservation_amount: number | null
          confirmed_reservations: number | null
          failed_reservations: number | null
          first_reservation_date: string | null
          latest_reservation_date: string | null
          pending_reservations: number | null
          total_confirmed_sol: number | null
          total_reservations: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      expire_old_payments: { Args: never; Returns: undefined }
      get_character_flags: {
        Args: { p_character_id: string }
        Returns: {
          acquired_at: string
          chapter_acquired: number
          flag_name: string
          flag_value: Json
          metadata: Json
          story_id: string
        }[]
      }
      get_character_visual_data: {
        Args: { character_id_param: string }
        Returns: Json
      }
      get_user_reservation_status: {
        Args: { wallet_addr: string }
        Returns: {
          has_reservation: boolean
          latest_status: string
          latest_transaction: string
          reservation_count: number
          total_amount: number
        }[]
      }
      has_story_flag: {
        Args: { p_character_id: string; p_flag_name: string }
        Returns: boolean
      }
      set_story_flag: {
        Args: {
          p_chapter?: number
          p_character_id: string
          p_flag_name: string
          p_flag_value?: Json
          p_metadata?: Json
          p_story_id?: string
        }
        Returns: string
      }
    }
    Enums: {
      CharacterType: "HUMAN" | "CREATURE" | "NPC"
      ChatMessageType: "CHAT" | "EMOTE" | "SYSTEM" | "WHISPER"
      ChatScope: "LOCAL" | "REGIONAL" | "GLOBAL"
      Gender: "MALE" | "FEMALE"
      ItemCategory:
        | "CLOTHING"
        | "HAT"
        | "ACCESSORY"
        | "TOOL"
        | "CONSUMABLE"
        | "MATERIAL"
      LayerType:
        | "BACKGROUND"
        | "BASE"
        | "CLOTHING"
        | "HAT"
        | "FACE_COVERING"
        | "ACCESSORY"
        | "OUTERWEAR"
        | "FACE_ACCESSORY"
        | "HAIR"
      LocationType:
        | "REGION"
        | "CITY"
        | "BUILDING"
        | "ROOM"
        | "REALM"
        | "CONTINENT"
        | "COUNTRY"
        | "PROVINCE"
        | "ISLAND"
        | "ARCHIPELAGO"
        | "DISTRICT"
        | "NEIGHBORHOOD"
        | "CAMPUS"
        | "COMPLEX"
        | "WING"
        | "FLOOR"
        | "SUITE"
        | "ZONE"
        | "CUBICLE"
        | "WORKSTATION"
        | "SEAT"
        | "PLOT"
        | "LOT"
        | "FACILITY"
        | "VENUE"
        | "CAVE_ENTRANCE"
        | "TUNNEL_JUNCTION"
        | "CHAMBER"
        | "ALCOVE"
        | "CREVICE"
        | "SHAFT"
        | "PIT"
        | "CHASM"
        | "GORGE"
        | "RAVINE"
        | "VALLEY"
        | "PEAK"
        | "SUMMIT"
        | "RIDGE"
        | "SLOPE"
        | "PLATEAU"
        | "PLAIN"
        | "BASIN"
        | "CRATER"
        | "CALDERA"
      Rarity: "COMMON" | "UNCOMMON" | "RARE" | "EPIC" | "LEGENDARY"
      TransactionType:
        | "MINT"
        | "MINE"
        | "BUY"
        | "SELL"
        | "TRAVEL"
        | "EQUIP"
        | "UNEQUIP"
        | "EXCHANGE"
        | "BRIDGE"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      CharacterType: ["HUMAN", "CREATURE", "NPC"],
      ChatMessageType: ["CHAT", "EMOTE", "SYSTEM", "WHISPER"],
      ChatScope: ["LOCAL", "REGIONAL", "GLOBAL"],
      Gender: ["MALE", "FEMALE"],
      ItemCategory: [
        "CLOTHING",
        "HAT",
        "ACCESSORY",
        "TOOL",
        "CONSUMABLE",
        "MATERIAL",
      ],
      LayerType: [
        "BACKGROUND",
        "BASE",
        "CLOTHING",
        "HAT",
        "FACE_COVERING",
        "ACCESSORY",
        "OUTERWEAR",
        "FACE_ACCESSORY",
        "HAIR",
      ],
      LocationType: [
        "REGION",
        "CITY",
        "BUILDING",
        "ROOM",
        "REALM",
        "CONTINENT",
        "COUNTRY",
        "PROVINCE",
        "ISLAND",
        "ARCHIPELAGO",
        "DISTRICT",
        "NEIGHBORHOOD",
        "CAMPUS",
        "COMPLEX",
        "WING",
        "FLOOR",
        "SUITE",
        "ZONE",
        "CUBICLE",
        "WORKSTATION",
        "SEAT",
        "PLOT",
        "LOT",
        "FACILITY",
        "VENUE",
        "CAVE_ENTRANCE",
        "TUNNEL_JUNCTION",
        "CHAMBER",
        "ALCOVE",
        "CREVICE",
        "SHAFT",
        "PIT",
        "CHASM",
        "GORGE",
        "RAVINE",
        "VALLEY",
        "PEAK",
        "SUMMIT",
        "RIDGE",
        "SLOPE",
        "PLATEAU",
        "PLAIN",
        "BASIN",
        "CRATER",
        "CALDERA",
      ],
      Rarity: ["COMMON", "UNCOMMON", "RARE", "EPIC", "LEGENDARY"],
      TransactionType: [
        "MINT",
        "MINE",
        "BUY",
        "SELL",
        "TRAVEL",
        "EQUIP",
        "UNEQUIP",
        "EXCHANGE",
        "BRIDGE",
      ],
    },
  },
} as const
