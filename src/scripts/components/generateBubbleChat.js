import { bubbleChat } from '../components/bubbleChat.js';
import { bubbleCourseRecommendation } from './bubbleRecommendation.js';
import bubbleRoadmap from './bubbleRoadmap.js';
import bubbleProgress from './bubbleProgress.js';

export function generateBubbleChat(message) {
  if (message.type === 'course-recommendation') {
    return bubbleCourseRecommendation(message);
  }

  if (message.type === 'roadmap') {
    return bubbleRoadmap(message);
  }

  if (message.type === 'progress-summary') {
    return bubbleProgress(message);
  }

  return bubbleChat(message);
}