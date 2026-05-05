export interface Event {
  id: string
  user_id: string
  title: string
  subtitle?: string
  event_date?: string
  event_time?: string
  end_time?: string
  location?: string
  address?: string
  description?: string
  image_path?: string
  accept_text: string
  decline_text: string
  reminder_message?: string
  day_of_message?: string
  rsvp_question_1?: string
  rsvp_question_2?: string
  active: boolean
  created_at: string
}

export interface Invitee {
  id: string
  event_id: string
  first_name: string
  last_name?: string
  email?: string
  token: string
  response?: 'yes' | 'no'
  message?: string
  rsvp_answer_1?: string
  rsvp_answer_2?: string
  responded_at?: string
  invited_at?: string
  reminder1_sent_at?: string
  reminder2_sent_at?: string
  created_at: string
}
