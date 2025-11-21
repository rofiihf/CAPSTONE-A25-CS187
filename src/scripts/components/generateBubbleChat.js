import { bubbleChat } from '../components/bubbleChat.js';
import { bubbleCourseRecommendation } from './bubbleRecommendation.js';

export function generateBubbleChat(message) {
  if (message.type === 'course-recommendation') {
    return bubbleCourseRecommendation(message);
  }
  
  return bubbleChat(message);
}