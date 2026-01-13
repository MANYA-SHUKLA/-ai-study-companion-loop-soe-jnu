"""
Adaptive Difficulty Service
Calculates and manages quiz difficulty based on user performance
"""

from typing import Dict, List, Optional, Tuple
from datetime import datetime, timedelta, timezone


class AdaptiveDifficultyService:
    """Service for calculating adaptive quiz difficulty based on performance"""

    @staticmethod
    def _parse_attempted_at(value) -> Optional[datetime]:
        """
        Parse an attempted_at value into a timezone-aware datetime (UTC).

        Supports:
        - ISO strings (with or without trailing 'Z')
        - datetime instances (naive treated as UTC)
        """
        if not value:
            return None
        if isinstance(value, datetime):
            return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
        if isinstance(value, str):
            try:
                dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
                return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)
            except ValueError:
                return None
        return None

    @staticmethod
    def _sort_by_attempted_at_desc(results: List[Dict]) -> List[Dict]:
        """
        Sort results by attempted_at (most recent first).
        Results without parsable timestamps are treated as oldest (stable).
        """
        def sort_key(r: Dict):
            dt = AdaptiveDifficultyService._parse_attempted_at(r.get("attempted_at"))
            # None -> very old
            return dt or datetime.min.replace(tzinfo=timezone.utc)

        return sorted(results, key=sort_key, reverse=True)
    
    @staticmethod
    def calculate_next_difficulty(
        current_difficulty: int,
        recent_results: List[Dict],
        base_difficulty: int = 2
    ) -> Tuple[int, str]:
        """
        Calculate next difficulty level based on recent performance
        
        Args:
            current_difficulty: Current difficulty level (1-5)
            recent_results: List of recent quiz results with 'is_correct' and 'time_taken_seconds'
            base_difficulty: Base difficulty from topic (default: 2)
        
        Returns:
            Tuple of (next_difficulty, reason)
        """
        if not recent_results:
            # No history: start with base difficulty
            return base_difficulty, "No performance history, using base difficulty"

        # Ensure recency is based on timestamps, not list order
        results_sorted = AdaptiveDifficultyService._sort_by_attempted_at_desc(recent_results)

        # Use a bounded window for stability (the caller typically pre-filters already)
        window = results_sorted[: min(len(results_sorted), 10)]

        # Calculate performance metrics (window)
        total = len(window)
        correct = sum(1 for r in window if r.get("is_correct", False))
        accuracy = (correct / total * 100) if total > 0 else 0
        
        # Calculate average time per question
        total_time = sum(r.get("time_taken_seconds", 0) or 0 for r in window)
        avg_time = total_time / total if total > 0 else 0

        # Very recent behavior (last 2 attempts) can override the broader window.
        # This makes the system responsive to quick improvement/decline without being too jittery.
        last2 = results_sorted[: min(len(results_sorted), 2)]
        if len(last2) == 2:
            last2_total = 2
            last2_correct = sum(1 for r in last2 if r.get("is_correct", False))
            last2_accuracy = (last2_correct / last2_total) * 100
            last2_avg_time = (
                sum(r.get("time_taken_seconds", 0) or 0 for r in last2) / last2_total
            )

            # Recent strong improvement: nudge difficulty up
            if last2_accuracy == 100 and last2_avg_time < 30:
                next_difficulty = min(5, current_difficulty + 1)
                reason = (
                    f"Recent strong performance (last 2: {last2_accuracy:.0f}%, "
                    f"avg time: {last2_avg_time:.1f}s) - increasing difficulty"
                )
                return next_difficulty, reason

            # Recent sharp decline: nudge difficulty down
            if last2_accuracy == 0 and last2_avg_time > 60:
                next_difficulty = max(1, current_difficulty - 1)
                reason = (
                    f"Recent weak performance (last 2: {last2_accuracy:.0f}%, "
                    f"avg time: {last2_avg_time:.1f}s) - decreasing difficulty"
                )
                return next_difficulty, reason
        
        # Determine next difficulty based on performance
        next_difficulty = current_difficulty
        reason = ""
        
        # Very high performance: increase by 2 (if possible)
        if accuracy >= 90 and avg_time < 20:
            next_difficulty = min(5, current_difficulty + 2)
            reason = f"Excellent performance (accuracy: {accuracy:.1f}%, avg time: {avg_time:.1f}s) - significantly increasing difficulty"

        # High performance: increase difficulty
        elif accuracy >= 80 and avg_time < 30:
            next_difficulty = min(5, current_difficulty + 1)
            reason = f"High performance (accuracy: {accuracy:.1f}%, avg time: {avg_time:.1f}s) - increasing difficulty"

        # Very low performance: decrease by 2 (if possible)
        elif accuracy < 50:
            next_difficulty = max(1, current_difficulty - 2)
            reason = f"Very low accuracy ({accuracy:.1f}%) - significantly decreasing difficulty"
        
        # Low performance: decrease difficulty
        elif accuracy < 60:
            next_difficulty = max(1, current_difficulty - 1)
            reason = f"Low accuracy ({accuracy:.1f}%) - decreasing difficulty"
        
        # Low performance with high time: decrease difficulty
        elif accuracy < 70 and avg_time > 60:
            next_difficulty = max(1, current_difficulty - 1)
            reason = f"Low performance (accuracy: {accuracy:.1f}%, avg time: {avg_time:.1f}s) - decreasing difficulty"
        
        # Medium performance: maintain or slight adjustment
        else:
            # If accuracy is between 60-80%, maintain current difficulty
            if 60 <= accuracy < 80:
                next_difficulty = current_difficulty
                reason = f"Moderate performance (accuracy: {accuracy:.1f}%) - maintaining difficulty"
            # If accuracy is 80%+ but time is high, maintain
            elif accuracy >= 80 and avg_time >= 30:
                next_difficulty = current_difficulty
                reason = f"Good accuracy ({accuracy:.1f}%) but slow (avg time: {avg_time:.1f}s) - maintaining difficulty"
            else:
                next_difficulty = current_difficulty
                reason = f"Balanced performance (accuracy: {accuracy:.1f}%, avg time: {avg_time:.1f}s) - maintaining difficulty"
        
        # Ensure difficulty is within bounds
        next_difficulty = max(1, min(5, next_difficulty))
        
        return next_difficulty, reason
    
    @staticmethod
    def get_recent_results_for_analysis(
        all_results: List[Dict],
        lookback_days: int = 7,
        max_results: int = 20
    ) -> List[Dict]:
        """
        Filter recent results for difficulty analysis
        
        Args:
            all_results: All quiz results for the topic
            lookback_days: Number of days to look back (default: 7)
            max_results: Maximum number of results to consider (default: 20)
        
        Returns:
            Filtered list of recent results
        """
        if not all_results:
            return []
        
        # Filter by date if results have 'attempted_at'
        cutoff_date = datetime.now(timezone.utc) - timedelta(days=lookback_days)
        recent_results = []
        
        for result in all_results:
            attempted_at = result.get("attempted_at")
            if attempted_at:
                try:
                    # Parse date string
                    if isinstance(attempted_at, str):
                        result_date = datetime.fromisoformat(attempted_at.replace('Z', '+00:00'))
                    else:
                        result_date = attempted_at
                    
                    if result_date >= cutoff_date:
                        recent_results.append(result)
                except:
                    # If date parsing fails, include the result anyway
                    recent_results.append(result)
            else:
                # If no date, include it (assume recent)
                recent_results.append(result)
        
        # Sort by date (most recent first) and limit
        recent_results.sort(
            key=lambda x: x.get("attempted_at", ""),
            reverse=True
        )
        
        return recent_results[:max_results]
    
    @staticmethod
    def get_adaptive_difficulty_for_topic(
        topic_id: str,
        user_id: str,
        current_difficulty: Optional[int] = None,
        base_difficulty: int = 2,
        lookback_days: int = 7
    ) -> Dict:
        """
        Get adaptive difficulty for a topic based on user performance
        
        This is a helper method that can be used by API endpoints
        """
        # This would need database access, so it's better to call this from routes
        # with the results already fetched
        pass

