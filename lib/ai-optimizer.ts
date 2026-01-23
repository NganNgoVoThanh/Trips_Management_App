// lib/ai-optimizer.ts
import { config, calculateDistance, calculateCost } from './config';
import { Trip } from './mysql-service';

export interface OptimizationProposal {
  id: string;
  trips: Trip[];
  proposedDepartureTime: string;
  vehicleType: string;
  estimatedSavings: number;
  savingsPercentage: number;
  totalDistance: number;
  explanation: string;
}

class AIOptimizer {
  private apiKey: string;
  private useOpenAI: boolean;

  constructor() {
    // Check for API keys
    this.apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY || '';
    this.useOpenAI = true;
    // Don't log here - will log when actually optimizing
  }

  async optimizeTrips(trips: Trip[]): Promise<OptimizationProposal[]> {
    try {
      // Validate input
      if (!Array.isArray(trips) || trips.length === 0) {
        console.log('No trips to optimize');
        return [];
      }

      console.log(`Starting optimization for ${trips.length} trips`);

      // Always start with basic optimization
      const basicProposals = await this.basicOptimization(trips);
      console.log(`Basic optimization found ${basicProposals.length} proposals`);

      // If API key is available, try AI optimization
      if (this.apiKey && this.apiKey !== 'your-openai-api-key') {
        try {
          console.log('Attempting AI optimization...');
          const aiProposals = await this.getAISuggestions(trips);
          
          if (Array.isArray(aiProposals) && aiProposals.length > 0) {
            console.log(`AI optimization found ${aiProposals.length} additional proposals`);
            // Combine basic and AI proposals
            const allProposals = [...basicProposals, ...aiProposals];
            return this.removeDuplicateProposals(allProposals);
          }
        } catch (aiError) {
          console.error('AI optimization failed, using basic optimization only:', aiError);
          // Continue with basic proposals
        }
      } else {
        console.log('No valid API key, using basic optimization only');
      }

      return basicProposals;
    } catch (error) {
      console.error('Error in optimizeTrips:', error);
      return [];
    }
  }

  private removeDuplicateProposals(proposals: OptimizationProposal[]): OptimizationProposal[] {
    const seen = new Set<string>();
    return proposals.filter(proposal => {
      const tripIds = proposal.trips.map(t => t.id).sort().join(',');
      if (seen.has(tripIds)) {
        return false;
      }
      seen.add(tripIds);
      return true;
    });
  }

  private groupTripsByDateAndRoute(trips: Trip[]): Trip[][] {
    const groups = new Map<string, Trip[]>();

    if (!Array.isArray(trips)) {
      return [];
    }

    trips.forEach(trip => {
      // Validate required fields
      if (!trip || !trip.departureDate || !trip.departureLocation || !trip.destination) {
        console.warn('Invalid trip data, skipping:', trip);
        return;
      }
      
      const key = `${trip.departureDate}-${trip.departureLocation}-${trip.destination}`;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(trip);
    });

    return Array.from(groups.values());
  }

  private async createOptimizationProposal(trips: Trip[]): Promise<OptimizationProposal | null> {
    if (!trips || trips.length === 0) return null;

    // Validate all trips have required fields
    const validTrips = trips.filter(t => 
      t.departureTime && 
      t.departureLocation && 
      t.destination &&
      t.departureDate
    );
    
    if (validTrips.length < 2) return null;

    // Calculate optimal departure time
    const times = validTrips.map(t => this.timeToMinutes(t.departureTime));
    const avgTime = Math.round(times.reduce((a, b) => a + b, 0) / times.length);
    const proposedTime = this.minutesToTime(avgTime);

    // Check if time differences are within acceptable range
    const maxDiff = Math.max(...times.map(t => Math.abs(t - avgTime)));
    if (maxDiff > config.optimization.maxWaitTime) {
      return null;
    }

    // Select appropriate vehicle based on passenger capacity (excluding driver)
    // Car 4-seater: 3 passengers, Car 7-seater: 6 passengers, Van 16-seater: 15 passengers
    const totalPassengers = validTrips.length;
    let vehicleType = 'car-4';
    if (totalPassengers > 3 && totalPassengers <= 6) {
      vehicleType = 'car-7';
    } else if (totalPassengers > 6 && totalPassengers <= 15) {
      vehicleType = 'van-16';
    } else if (totalPassengers > 15) {
      // Too many passengers for a single vehicle
      return null;
    }

    // Calculate savings
    const distance = calculateDistance(validTrips[0].departureLocation, validTrips[0].destination);
    const individualCost = validTrips.reduce((total, trip) => {
      return total + calculateCost(distance, 'car-4');
    }, 0);
    const combinedCost = calculateCost(distance, vehicleType);
    const savings = individualCost - combinedCost;
    const savingsPercentage = savings > 0 ? (savings / individualCost) * 100 : 0;

    if (savingsPercentage < config.optimization.minSavingsPercentage) {
      return null;
    }

    return {
      id: `proposal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      trips: validTrips,
      proposedDepartureTime: proposedTime,
      vehicleType,
      estimatedSavings: savings,
      savingsPercentage,
      totalDistance: distance,
      explanation: `Combining ${validTrips.length} trips can save ${Math.round(savingsPercentage)}% by using a ${config.vehicles[vehicleType as keyof typeof config.vehicles].name}`
    };
  }

  private async getAISuggestions(trips: Trip[]): Promise<OptimizationProposal[]> {
    try {
      const prompt = this.buildOptimizationPrompt(trips);
      
      if (this.useOpenAI) {
        return await this.getOpenAISuggestions(prompt, trips);
      } else {
        return await this.getClaudeSuggestions(prompt, trips);
      }
    } catch (error) {
      console.error('Error getting AI suggestions:', error);
      return [];
    }
  }

  private buildOptimizationPrompt(trips: Trip[]): string {
    const tripsData = trips.map(t => ({
      id: t.id,
      from: config.locations[t.departureLocation as keyof typeof config.locations]?.name || t.departureLocation,
      to: config.locations[t.destination as keyof typeof config.locations]?.name || t.destination,
      date: t.departureDate,
      time: t.departureTime,
      returnDate: t.returnDate,
      returnTime: t.returnTime
    }));

    return `
Analyze these business trips and suggest optimal groupings to minimize costs:

Trips:
${JSON.stringify(tripsData, null, 2)}

Available vehicles (passenger capacity EXCLUDES driver):
- car-4 (4-seater car): Max 3 passengers, 8,000 VND/km
- car-7 (7-seater car): Max 6 passengers, 10,000 VND/km
- van-16 (16-seater van): Max 15 passengers, 15,000 VND/km

Constraints:
- Maximum wait time: ${config.optimization.maxWaitTime} minutes
- Maximum detour: ${config.optimization.maxDetour} km
- Minimum savings: ${config.optimization.minSavingsPercentage}%
- Each trip = 1 passenger

Please suggest trip combinations that would result in cost savings.

IMPORTANT: Return ONLY a valid JSON array (not an object). The format must be exactly:
[
  {
    "tripIds": ["id1", "id2"],
    "proposedTime": "HH:MM",
    "vehicle": "car-7",
    "savingsPercentage": 25,
    "explanation": "reason"
  }
]

If no optimizations are possible, return an empty array: []
Do not include any text outside the JSON array.`;
  }

  private async getOpenAISuggestions(prompt: string, trips: Trip[]): Promise<OptimizationProposal[]> {
    try {
      // Check if API key exists
      if (!this.apiKey || this.apiKey === 'your-openai-api-key') {
        console.log('Invalid or missing OpenAI API key');
        return [];
      }

      console.log('Calling OpenAI API...');
      
      const response = await fetch(`${config.api.openai.endpoint}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: config.api.openai.model || 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: 'You are a trip optimization expert. Analyze business trips and suggest optimal groupings to minimize costs. Always return a valid JSON array only, with no additional text.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.7,
          max_tokens: 2000
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('OpenAI API error:', response.status, errorText);
        return [];
      }

      const data = await response.json();
      
      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        console.error('Invalid OpenAI response structure:', data);
        return [];
      }

      const content = data.choices[0].message.content;
      console.log('OpenAI response received, parsing...');
      
      // Try to extract JSON from the response
      let suggestions = [];
      
      try {
        // First, try direct parsing
        suggestions = JSON.parse(content);
      } catch (parseError) {
        console.log('Direct parsing failed, trying to extract JSON...');
        
        // Try to find JSON array in the response
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          try {
            suggestions = JSON.parse(jsonMatch[0]);
            console.log('Successfully extracted JSON from response');
          } catch (extractError) {
            console.error('Failed to extract JSON:', extractError);
            return [];
          }
        } else {
          console.error('No JSON array found in response');
          return [];
        }
      }
      
      // Validate that we have an array
      if (!Array.isArray(suggestions)) {
        console.error('Response is not an array:', suggestions);
        return [];
      }
      
      console.log(`Parsed ${suggestions.length} suggestions from OpenAI`);
      return this.processAISuggestions(suggestions, trips);
      
    } catch (error) {
      console.error('Error in getOpenAISuggestions:', error);
      return [];
    }
  }

  private async getClaudeSuggestions(prompt: string, trips: Trip[]): Promise<OptimizationProposal[]> {
    try {
      // Check if API key exists
      if (!this.apiKey) {
        console.log('No Claude API key configured');
        return [];
      }

      const response = await fetch(`${config.api.claude.endpoint}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: config.api.claude.model || 'claude-3-opus-20240229',
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 2000
        })
      });

      if (!response.ok) {
        console.error('Claude API error:', response.status);
        return [];
      }

      const data = await response.json();
      
      if (!data.content || !data.content[0]) {
        console.error('Invalid Claude response structure');
        return [];
      }

      const content = data.content[0].text;
      
      // Try to extract JSON from the response
      let suggestions = [];
      
      try {
        // First, try direct parsing
        suggestions = JSON.parse(content);
      } catch (parseError) {
        // Try to find JSON array in the response
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          try {
            suggestions = JSON.parse(jsonMatch[0]);
          } catch (extractError) {
            console.error('Failed to extract JSON from Claude response');
            return [];
          }
        } else {
          console.error('No JSON array found in Claude response');
          return [];
        }
      }
      
      // Validate that we have an array
      if (!Array.isArray(suggestions)) {
        console.error('Claude response is not an array');
        return [];
      }
      
      return this.processAISuggestions(suggestions, trips);
      
    } catch (error) {
      console.error('Error in getClaudeSuggestions:', error);
      return [];
    }
  }

  private processAISuggestions(suggestions: any, trips: Trip[]): OptimizationProposal[] {
    const proposals: OptimizationProposal[] = [];
    
    // Ensure suggestions is an array
    if (!Array.isArray(suggestions)) {
      console.error('Invalid suggestions format: expected array');
      return proposals;
    }
    
    for (const suggestion of suggestions) {
      // Validate suggestion structure
      if (!suggestion || !suggestion.tripIds || !Array.isArray(suggestion.tripIds)) {
        console.warn('Invalid suggestion format, skipping:', suggestion);
        continue;
      }
      
      const selectedTrips = trips.filter(t => suggestion.tripIds.includes(t.id));
      
      if (selectedTrips.length > 1) {
        const distance = calculateDistance(
          selectedTrips[0].departureLocation,
          selectedTrips[0].destination
        );
        
        const individualCost = selectedTrips.length * calculateCost(distance, 'car-4');
        const combinedCost = calculateCost(distance, suggestion.vehicle || 'car-4');
        const savings = individualCost - combinedCost;
        const savingsPercentage = savings > 0 ? (savings / individualCost) * 100 : 0;
        
        if (savingsPercentage >= config.optimization.minSavingsPercentage) {
          proposals.push({
            id: `ai-proposal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            trips: selectedTrips,
            proposedDepartureTime: suggestion.proposedTime || selectedTrips[0].departureTime,
            vehicleType: suggestion.vehicle || 'car-4',
            estimatedSavings: savings,
            savingsPercentage: suggestion.savingsPercentage || savingsPercentage,
            totalDistance: distance,
            explanation: suggestion.explanation || 'AI suggested optimization'
          });
        }
      }
    }
    
    return proposals;
  }

  private basicOptimization(trips: Trip[]): OptimizationProposal[] {
    const proposals: OptimizationProposal[] = [];
    
    try {
      const grouped = this.groupTripsByDateAndRoute(trips);
      console.log(`Found ${grouped.length} trip groups by date and route`);
      
      for (const group of grouped) {
        if (group.length > 1) {
          const proposal = this.createBasicProposal(group);
          if (proposal) {
            proposals.push(proposal);
            console.log(`Created proposal for ${group.length} trips`);
          }
        }
      }
    } catch (error) {
      console.error('Error in basic optimization:', error);
    }
    
    return proposals;
  }

  private createBasicProposal(trips: Trip[]): OptimizationProposal | null {
    if (!trips || trips.length < 2) return null;
    
    // Validate all trips have required fields
    const validTrips = trips.filter(t => 
      t.departureTime && 
      t.departureLocation && 
      t.destination &&
      t.departureDate
    );
    
    if (validTrips.length < 2) return null;
    
    // Find the earliest departure time
    const earliestTime = validTrips.reduce((min, trip) => {
      return trip.departureTime < min ? trip.departureTime : min;
    }, validTrips[0].departureTime);
    
    // Select vehicle based on group size
    let vehicleType = 'car-4';
    if (validTrips.length > 4 && validTrips.length <= 7) {
      vehicleType = 'car-7';
    } else if (validTrips.length > 7 && validTrips.length <= 16) {
      vehicleType = 'van-16';
    } else if (validTrips.length > 16) {
      // Too many passengers for a single vehicle
      return null;
    }
    
    const distance = calculateDistance(validTrips[0].departureLocation, validTrips[0].destination);
    const individualCost = validTrips.length * calculateCost(distance, 'car-4');
    const combinedCost = calculateCost(distance, vehicleType);
    const savings = individualCost - combinedCost;
    const savingsPercentage = savings > 0 ? (savings / individualCost) * 100 : 0;
    
    if (savingsPercentage < config.optimization.minSavingsPercentage) {
      return null;
    }
    
    return {
      id: `basic-proposal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      trips: validTrips,
      proposedDepartureTime: earliestTime,
      vehicleType,
      estimatedSavings: savings,
      savingsPercentage,
      totalDistance: distance,
      explanation: `Group ${validTrips.length} similar trips to save ${Math.round(savingsPercentage)}% costs`
    };
  }

  private timeToMinutes(time: string): number {
    if (!time || typeof time !== 'string') return 0;
    
    const parts = time.split(':');
    if (parts.length !== 2) return 0;
    
    const [hours, minutes] = parts.map(Number);
    if (isNaN(hours) || isNaN(minutes)) return 0;
    
    return hours * 60 + minutes;
  }

  private minutesToTime(minutes: number): string {
    if (!minutes || minutes < 0) minutes = 0;
    if (minutes >= 1440) minutes = 1439; // Max 23:59
    
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  }
}

export const aiOptimizer = new AIOptimizer();
