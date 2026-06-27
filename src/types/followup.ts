export interface VoiceProfile {
  application_id: string
  voice_sample_raw: string
  voice_profile_text: string
  sentence_length_avg?: number
  vocabulary_level?: 'accessible' | 'professional' |
    'technical' | 'mixed'
  formality_register?: 'formal' | 'warm_formal' |
    'conversational' | 'mixed'
  ai_detection_score?: number
  ai_detection_passed: boolean
  ai_detection_flagged: boolean
}

export interface FollowupQuestion {
  id: string
  gap_category: string
  question_text: string
  why_it_matters: string
  question_number: number
}

export interface FollowupResponse {
  application_id: string
  gap_category: string
  question_text: string
  answer_text: string
  content_value: 'high' | 'medium' | 'low' | 'none'
  relevant_documents: string[]
  question_number: number
}

export interface FollowupSession {
  application_id: string
  questions: FollowupQuestion[]
  responses: FollowupResponse[]
  voice_sample_collected: boolean
  completed: boolean
  completion_summary: string[]
}
