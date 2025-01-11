import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Box, Typography } from '@mui/material';

const TrendGraph = ({ title, trendData }) => {
  // Early return for invalid data
  if (!trendData || !Array.isArray(trendData) || trendData.length === 0) {
    return (
      <Box sx={{ 
        width: '100%',
        height: '350px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: 2,
        backgroundColor: '#ffffff',
        borderRadius: 1,
        p: 3
      }}>
        <Typography variant="h6" color="text.secondary">
          No trend data available
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Try uploading a different photo or checking back later
        </Typography>
      </Box>
    );
  }

  // Transform the data to ensure it's in the correct format
  const formattedData = trendData.map((item, index) => {
    // Handle both possible data structures
    if (typeof item === 'object' && item !== null) {
      return {
        name: item.date || item.month || `Month ${index + 1}`,
        value: typeof item.interest === 'number' ? item.interest :
               typeof item.volume === 'number' ? item.volume : 0
      };
    }
    // Handle primitive values
    return {
      name: `Month ${index + 1}`,
      value: typeof item === 'number' ? item : 0
    };
  });

  return (
    <Box sx={{ 
      width: '100%', 
      height: '100%',
      minHeight: '350px',
      position: 'relative',
      px: 2,
      pb: 4,
      backgroundColor: '#ffffff',
      borderRadius: 1
    }}>
      <ResponsiveContainer>
        <LineChart
          data={formattedData}
          margin={{
            top: 20,
            right: 25,
            left: 25,
            bottom: 50,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="name" 
            tick={{ fontSize: 12 }}
            tickMargin={15}
            height={60}
            interval={0}
          />
          <YAxis 
            tick={{ fontSize: 12 }}
            domain={[0, 'auto']}
            tickFormatter={(value) => `${value}`}
            width={55}
            tickMargin={10}
          />
          <Tooltip 
            formatter={(value) => [value, 'Interest']}
            labelFormatter={(label) => `${label}`}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke="#2196f3"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </Box>
  );
};

export default TrendGraph;
