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

const TrendGraph = ({ title, trendData }) => {
  return (
    <div style={{ width: '100%', height: 300, paddingBottom: '40px' }}>
      <ResponsiveContainer>
        <LineChart
          data={trendData}
          margin={{
            top: 20,
            right: 30,
            left: 30,
            bottom: 45,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="month" 
            tick={{ fontSize: 12 }}
            tickMargin={15}
            interval={0}
          />
          <YAxis 
            tick={{ fontSize: 12 }}
            domain={[0, 100]}
            tickFormatter={(value) => `${value}%`}
            width={60}
          />
          <Tooltip 
            formatter={(value) => [`${value}%`, 'Interest']}
            labelFormatter={(label) => `Month: ${label}`}
          />
          <Line
            type="monotone"
            dataKey="interest"
            stroke="#2196f3"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 8 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default TrendGraph;
